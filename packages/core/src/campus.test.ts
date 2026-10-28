import { describe, expect, it } from "vitest";
import { groupJoinBlock, isAccessibilityPlace, matchesSearch, parseUnifebBanners, rsvpBlock, searchKey } from "./campus";

describe("grupos de estudo", () => {
  const base = { isMember: false, members: 2, maxMembers: 5, meetsAt: 2_000, now: 1_000 };

  it("deixa entrar quando há vaga e o encontro é futuro", () => {
    expect(groupJoinBlock(base)).toBeNull();
  });

  it("bloqueia membro repetido, grupo cheio e encontro que já passou", () => {
    expect(groupJoinBlock({ ...base, isMember: true })).toBe("already_member");
    expect(groupJoinBlock({ ...base, members: 5 })).toBe("full");
    expect(groupJoinBlock({ ...base, now: 3_000 })).toBe("past");
  });
});

describe("busca do campus", () => {
  it("ignora acentos, maiúsculas e ordem das palavras", () => {
    expect(searchKey("  Laboratório  ")).toBe("laboratorio");
    expect(matchesSearch("sala bloco b", "Sala 12", "Bloco B")).toBe(true);
    expect(matchesSearch("biblio", "Biblioteca")).toBe(true);
    expect(matchesSearch("cantina", "Biblioteca")).toBe(false);
    expect(matchesSearch("", "qualquer")).toBe(true);
  });
});

describe("acessibilidade", () => {
  it("reconhece pela categoria ou pela marcação de acessível", () => {
    expect(isAccessibilityPlace({ category: "ramp", accessible: false })).toBe(true);
    expect(isAccessibilityPlace({ category: "elevator", accessible: false })).toBe(false);
    expect(isAccessibilityPlace({ category: "library", accessible: true })).toBe(true);
    expect(isAccessibilityPlace({ category: "library", accessible: false })).toBe(false);
  });
});

describe("confirmação de presença (Atlética)", () => {
  const base = { isConfirmed: false, confirmed: 3, capacity: 10 as number | null, startsAt: 2_000, now: 1_000 };

  it("aceita enquanto há vaga e o jogo não começou", () => {
    expect(rsvpBlock(base)).toBeNull();
    expect(rsvpBlock({ ...base, capacity: null, confirmed: 500 })).toBeNull();
  });

  it("bloqueia repetido, lotado e jogo já começado", () => {
    expect(rsvpBlock({ ...base, isConfirmed: true })).toBe("already_confirmed");
    expect(rsvpBlock({ ...base, confirmed: 10 })).toBe("full");
    expect(rsvpBlock({ ...base, now: 2_000 })).toBe("started");
  });
});

describe("banners do site do UNIFEB", () => {
  const html = `
    <section id="slider"><div id="oc-slider" class="owl-carousel">
      <a href="https://sistema.unifeb.edu.br/"><img src="http://unifeb.edu.br/uploads/banners/banner_314_1.png" alt=""></a>
      <a href="/pos-graduacao/simposio-sip"><img src="http://unifeb.edu.br/uploads/banners/banner_316_1.png"></a>
      <img src="http://unifeb.edu.br/uploads/banners/banner_307_1.jpg" alt="">
      <a href="javascript:alert(1)"><img src="http://unifeb.edu.br/uploads/banners/banner_1_1.png"></a>
      <a href="https://sistema.unifeb.edu.br/"><img src="http://unifeb.edu.br/uploads/banners/banner_314_1.png"></a>
    </div></section>
    <section><img src="http://unifeb.edu.br/uploads/posts/fora-do-carrossel.png"></section>`;

  it("lê imagem e link do carrossel, em https, sem repetir", () => {
    expect(parseUnifebBanners(html)).toEqual([
      { imageUrl: "https://www.unifeb.edu.br/uploads/banners/banner_314_1.png", linkUrl: "https://sistema.unifeb.edu.br/" },
      { imageUrl: "https://www.unifeb.edu.br/uploads/banners/banner_316_1.png", linkUrl: "https://www.unifeb.edu.br/pos-graduacao/simposio-sip" },
      { imageUrl: "https://www.unifeb.edu.br/uploads/banners/banner_307_1.jpg", linkUrl: null },
      { imageUrl: "https://www.unifeb.edu.br/uploads/banners/banner_1_1.png", linkUrl: null },
    ]);
  });

  it("devolve lista vazia se o site mudar", () => {
    expect(parseUnifebBanners("<html><body>nada</body></html>")).toEqual([]);
  });
});
