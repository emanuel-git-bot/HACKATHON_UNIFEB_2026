import { beforeEach, describe, expect, it } from "vitest";
import { FAR_GPS, NEAR_GPS, createClient, createTestDb, eventPayload, login, seedBasics, type TestClient } from "./helpers";

let env: { DB: D1Database };
let coord: TestClient;
let eventId: string;

beforeEach(async () => {
  env = { DB: createTestDb() };
  await seedBasics(env.DB);
  coord = createClient(env);
  await login(coord, "coord1");
  eventId = (await coord.json("/coord/events", { body: eventPayload() })).body.event.id;
  await coord.json(`/coord/events/${eventId}/phase`, { body: { phase: "entry", open: true } });
});

async function checkin(ra: string, gps: unknown) {
  const student = createClient(env);
  await login(student, ra);
  const { code } = (await coord.json(`/coord/events/${eventId}/qr`)).body;
  const scan = await student.json("/scan", { body: { eventId, phase: "entry", code } });
  const r = await student.json("/checkin", { body: { ticket: scan.body.ticket, gps } });
  return { student, attendanceId: r.body.attendance.id as string };
}

describe("revisão de suspeitas", () => {
  it("confirmar conclui a presença e emite certificado para o aluno", async () => {
    const { student, attendanceId } = await checkin("1001", FAR_GPS);
    const r = await coord.json(`/coord/attendance/${attendanceId}/review`, { body: { decision: "confirm" } });
    expect(r.status).toBe(200);
    expect(r.body.attendance.status).toBe("completed");
    const certs = await student.json("/me/certificates");
    expect(certs.body.certificates).toHaveLength(1);
    expect(certs.body.totalHours).toBe(4);
  });

  it("recusar não gera horas nem certificado", async () => {
    const { student, attendanceId } = await checkin("1001", FAR_GPS);
    const r = await coord.json(`/coord/attendance/${attendanceId}/review`, { body: { decision: "reject" } });
    expect(r.body.attendance.status).toBe("rejected");
    expect((await student.json("/me/certificates")).body.totalHours).toBe(0);
  });

  it("só revisa presença suspeita", async () => {
    const { attendanceId } = await checkin("1001", NEAR_GPS);
    const r = await coord.json(`/coord/attendance/${attendanceId}/review`, { body: { decision: "reject" } });
    expect(r.status).toBe(409);
  });

  it("coordenador de outro curso não revisa", async () => {
    const { attendanceId } = await checkin("1001", FAR_GPS);
    const other = createClient(env);
    await login(other, "coord2");
    const r = await other.json(`/coord/attendance/${attendanceId}/review`, { body: { decision: "confirm" } });
    expect(r.status).toBe(403);
  });
});

describe("lançamento manual e lista em papel", () => {
  it("lança presença por RA como manual e gera certificado", async () => {
    const r = await coord.json(`/coord/events/${eventId}/manual`, { body: { ra: "1002" } });
    expect(r.status).toBe(200);
    expect(r.body.attendance).toMatchObject({ status: "completed", origin: "manual" });
    expect(r.body.certificateId).toBeTruthy();
  });

  it("lançar duas vezes não duplica o certificado", async () => {
    const a = await coord.json(`/coord/events/${eventId}/manual`, { body: { ra: "1002" } });
    const b = await coord.json(`/coord/events/${eventId}/manual`, { body: { ra: "1002" } });
    expect(a.body.certificateId).toBe(b.body.certificateId);
  });

  it("recusa RA inexistente e aluno de outro curso", async () => {
    expect((await coord.json(`/coord/events/${eventId}/manual`, { body: { ra: "0000" } })).status).toBe(404);
    expect((await coord.json(`/coord/events/${eventId}/manual`, { body: { ra: "2001" } })).status).toBe(403);
  });

  it("lista de impressão traz os inscritos", async () => {
    const student = createClient(env);
    await login(student, "1001");
    await student.json(`/events/${eventId}/register`, { body: {} });
    const r = await coord.json(`/coord/events/${eventId}/print`);
    expect(r.body.registrants).toEqual([{ name: "Aluno Um", ra: "1001" }]);
  });

  it("presenças e histórico de tentativas aparecem para o coordenador", async () => {
    await checkin("1001", NEAR_GPS);
    await createClient(env).json("/scan", { body: { eventId, phase: "entry", code: "ZZZZZZZZ" } });
    const att = await coord.json(`/coord/events/${eventId}/attendance`);
    expect(att.body.attendance[0]).toMatchObject({ studentRa: "1001", status: "completed", origin: "qr" });
    const attempts = await coord.json(`/coord/events/${eventId}/attempts`);
    const reasons = attempts.body.attempts.map((a: any) => a.reason);
    expect(reasons).toContain("qr_invalid");
    expect(reasons).toContain("ok_gps");
  });
});

describe("certificados", () => {
  it("verificação pública mostra só os dados do certificado", async () => {
    const r = await coord.json(`/coord/events/${eventId}/manual`, { body: { ra: "1002" } });
    const cert = await coord.json(`/certificates/${r.body.certificateId}`);
    const code = cert.body.certificate.verificationCode;
    expect(code).toMatch(/^SFB-/);

    const pub = await createClient(env).json(`/verify/${code.toLowerCase()}`);
    expect(pub.status).toBe(200);
    expect(pub.body.valid).toBe(true);
    expect(Object.keys(pub.body.certificate).sort()).toEqual(
      [
        "courseName", "eventEndsAt", "eventLocation", "eventStartsAt", "eventTitle", "hours", "id", "issuedAt",
        "studentName", "studentRa", "verificationCode",
      ].sort(),
    );
  });

  it("código inexistente não é encontrado", async () => {
    const pub = await createClient(env).json("/verify/SFB-AAAA-BBBB");
    expect(pub.status).toBe(404);
    expect(pub.body.valid).toBe(false);
  });

  it("aluno não abre certificado de outro aluno", async () => {
    const r = await coord.json(`/coord/events/${eventId}/manual`, { body: { ra: "1002" } });
    const other = createClient(env);
    await login(other, "1001");
    expect((await other.json(`/certificates/${r.body.certificateId}`)).status).toBe(403);
  });
});

describe("admin", () => {
  let admin: TestClient;
  beforeEach(async () => {
    admin = createClient(env);
    await login(admin, "admin");
  });

  it("cadastra coordenador que entra e vê só o próprio curso", async () => {
    const r = await admin.json("/admin/coordinators", {
      body: { name: "Nova Coord", login: "nova.coord", courseId: "c2", password: "inicial1" },
    });
    expect(r.status).toBe(201);
    const nova = createClient(env);
    const me = await login(nova, "nova.coord", "inicial1");
    expect(me.user.courseId).toBe("c2");
    expect((await nova.json(`/coord/events/${eventId}`)).status).toBe(403);
    expect((await nova.json("/coord/events")).body.events).toHaveLength(0);
  });

  it("desativar coordenador derruba a sessão e impede login", async () => {
    await admin.json("/admin/coordinators/coord1", { method: "PUT", body: { active: false } });
    expect((await coord.json("/coord/events")).status).toBe(401);
    expect((await createClient(env).json("/auth/login", { body: { ra: "coord1", password: "senha123" } })).status).toBe(401);
  });

  it("cadastra curso e configura IPs autorizados", async () => {
    expect((await admin.json("/admin/courses", { body: { name: "Direito" } })).status).toBe(201);
    expect((await admin.json("/admin/courses", { body: { name: "Direito" } })).status).toBe(409);
    const net = await admin.json("/admin/settings/network", { method: "PUT", body: { allowedIps: ["200.150.10.0/24"] } });
    expect(net.body.allowedIps).toEqual(["200.150.10.0/24"]);
    const bad = await admin.json("/admin/settings/network", { method: "PUT", body: { allowedIps: ["abc"] } });
    expect(bad.status).toBe(400);
    const get = await admin.json("/admin/settings/network");
    expect(get.body.currentIp).toBe("177.10.20.30");
  });
});
