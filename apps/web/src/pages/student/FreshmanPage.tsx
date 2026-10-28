import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronDown, Circle, ExternalLink, MapPin, Phone, Sparkles } from "lucide-react";
import { Card, PageTitle, cx } from "../../components/ui";

const CHECKLIST_KEY = "campusfeb_checklist";

/** Primeiros passos do calouro. Conteúdo tirado do site oficial do UNIFEB. */
const FIRST_STEPS = [
  { id: "portal", title: "Entrar no Portal do Aluno", detail: "Notas, faltas, boletos e documentos ficam lá.", href: "https://sistema.unifeb.edu.br/" },
  { id: "email", title: "Ativar o e-mail @unifeb.edu.br", detail: "É uma conta Google: dá acesso ao Drive e às turmas. Problemas? Procure o DTI.", href: "https://mail.google.com/" },
  { id: "calendario", title: "Salvar o calendário acadêmico 2026", detail: "Provas, feriados e recessos do ano.", href: "https://www.unifeb.edu.br/uploads/arquivos/CALEND%C3%81RIO%20ACADEMICO%20-%202026.pdf" },
  { id: "sala", title: "Achar sua sala no mapa", detail: "Busque pelo número da sala ou pelo bloco.", to: "/mapa?filtro=classes" },
  { id: "biblioteca", title: "Conhecer a Biblioteca", detail: "Seg a sex, 9h às 22h. Empréstimo de livros só para alunos.", to: "/mapa?local=pl_biblioteca" },
  { id: "grupo", title: "Entrar em um grupo de estudo", detail: "Estudar junto é o melhor jeito de pegar o ritmo.", to: "/grupos" },
  { id: "eventos", title: "Ir a um evento e ganhar horas", detail: "Palestras contam como atividades complementares; os jogos da Atlética são para se divertir.", to: "/eventos" },
  { id: "proaluno", title: "Saber onde fica o Pró-Aluno", detail: "Se algo apertar (adaptação, dinheiro, saúde mental), é lá que te ajudam.", to: "/mapa?local=pl_proaluno" },
];

const FAQ = [
  {
    q: "O que são horas complementares?",
    a: "São horas de atividades fora da sala (palestras, eventos acadêmicos, cursos) que todo curso exige para se formar. No Campus FEB, cada evento com presença confirmada soma automaticamente na aba Horas.",
  },
  {
    q: "Não estou me adaptando. Com quem falo?",
    a: "O Pró-Aluno faz acolhimento e orientação psicológica, social e pedagógica: dificuldade de adaptação, mudança de cidade, dúvida sobre o curso, conflitos e dificuldade financeira. Telefone (17) 3321-6330. O NAPE também apoia na parte pedagógica: (17) 3321-6388.",
  },
  {
    q: "Como consigo bolsa ou financiamento?",
    a: "O UNIFEB trabalha com ProUni, FIES, Bolsas Santander e bolsas próprias, além de convênio com o CIEE e iniciação científica (PIBIC). Procure o setor de Bolsas e Financiamento: (17) 3321-6353.",
  },
  {
    q: "Quero estágio. Por onde começo?",
    a: "O NEU (Núcleo de Empregabilidade) cuida dos estágios não obrigatórios e tem parceria com mais de 900 empresas e órgãos públicos. O estágio obrigatório segue as regras de cada curso: fale com sua coordenação.",
  },
  {
    q: "Wi-Fi, e-mail ou portal não funcionam. E agora?",
    a: "O DTI (Departamento de Tecnologia da Informação) resolve: (17) 3321-6370.",
  },
  {
    q: "Preciso de declaração de matrícula ou histórico.",
    a: "É com a Secretaria Acadêmica: (17) 3321-6372.",
  },
  {
    q: "Tenho uma reclamação ou sugestão para a faculdade.",
    a: "Use a Ouvidoria do UNIFEB. Você pode pedir sigilo da sua identidade.",
  },
];

const GLOSSARY: [string, string][] = [
  ["RA", "Registro Acadêmico: seu número de aluno (é o seu login aqui)."],
  ["AC", "Atividades complementares: as horas extras obrigatórias para se formar."],
  ["Pró-Aluno", "Setor de acolhimento e apoio ao estudante."],
  ["NAPE", "Núcleo de apoio psicopedagógico."],
  ["NEU", "Núcleo de Empregabilidade: estágios e vagas."],
  ["DTI", "Suporte de tecnologia: Wi-Fi, e-mail, portal."],
  ["NPJ", "Núcleo de Prática Jurídica (curso de Direito)."],
  ["FAB LAB", "Espaço maker com impressora 3D e corte a laser."],
  ["SESINFO", "Semana de Sistemas de Informação, com palestras e hackathon."],
  ["ENADE", "Prova nacional que avalia os cursos; é obrigatória para quem é convocado."],
  ["TCC", "Trabalho de Conclusão de Curso."],
];

const CONTACTS: [string, string][] = [
  ["Secretaria", "(17) 3321-6372"],
  ["Pró-Aluno", "(17) 3321-6330"],
  ["NAPE", "(17) 3321-6388"],
  ["Bolsas e Financiamento", "(17) 3321-6353"],
  ["Biblioteca", "(17) 3321-6458"],
  ["DTI (suporte de TI)", "(17) 3321-6370"],
  ["Coordenação de Cursos", "(17) 3321-6415"],
  ["Central UNIFEB", "(17) 3321-6411"],
];

const LINKS: [string, string][] = [
  ["Portal do Aluno", "https://sistema.unifeb.edu.br/"],
  ["Site do UNIFEB", "https://www.unifeb.edu.br/"],
  ["Biblioteca online", "https://unifeb.edu.br/biblioteca"],
  ["Ouvidoria", "https://www.unifeb.edu.br/ouvidoria"],
  ["Instagram oficial", "https://instagram.com/unifeb_barretos"],
];

function loadChecklist(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function FreshmanPage() {
  const [done, setDone] = useState<string[]>(loadChecklist);
  const [open, setOpen] = useState<number | null>(0);
  const progress = Math.round((done.length / FIRST_STEPS.length) * 100);

  function toggle(id: string) {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      } catch {
        /* sem storage: vale só nesta visita */
      }
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Guia do Calouro" subtitle="Tudo o que ninguém te conta na primeira semana." />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold">
            <Sparkles className="size-5 text-gold-500" aria-hidden /> Primeiros passos
          </h2>
          <span className="text-sm font-semibold text-brand-800">{progress}%</span>
        </div>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <ul className="space-y-1">
          {FIRST_STEPS.map((step) => {
            const checked = done.includes(step.id);
            return (
              <li key={step.id} className="flex items-start gap-3 rounded-xl p-2 hover:bg-slate-50">
                <button onClick={() => toggle(step.id)} aria-pressed={checked} aria-label={`Marcar "${step.title}" como feito`} className="mt-0.5 shrink-0">
                  {checked ? <CheckCircle2 className="size-6 text-emerald-600" aria-hidden /> : <Circle className="size-6 text-slate-300" aria-hidden />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cx("font-semibold", checked && "text-slate-400 line-through")}>{step.title}</p>
                  <p className="text-sm text-slate-500">{step.detail}</p>
                </div>
                {step.to ? (
                  <Link to={step.to} className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                    Abrir
                  </Link>
                ) : (
                  <a href={step.href} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                    Abrir
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <section>
        <h2 className="mb-2 text-lg font-bold">Perguntas frequentes</h2>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {FAQ.map((item, i) => (
            <div key={item.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left font-semibold hover:bg-slate-50"
              >
                {item.q}
                <ChevronDown className={cx("size-4 shrink-0 text-slate-400 transition", open === i && "rotate-180")} aria-hidden />
              </button>
              {open === i && <p className="px-4 pb-4 text-sm text-slate-700">{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Telefones úteis</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CONTACTS.map(([name, phone]) => (
            <li key={name}>
              <a href={`tel:+55${phone.replace(/\D/g, "")}`} className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-white px-4 py-2 shadow-sm ring-1 ring-slate-200 hover:ring-brand-500">
                <span className="text-sm font-semibold">{name}</span>
                <span className="flex items-center gap-1.5 text-sm text-brand-700">
                  <Phone className="size-4" aria-hidden /> {phone}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Siglas que você vai ouvir</h2>
        <dl className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          {GLOSSARY.map(([term, meaning]) => (
            <div key={term} className="flex gap-3 text-sm">
              <dt className="w-20 shrink-0 font-bold text-brand-800">{term}</dt>
              <dd className="text-slate-700">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Links oficiais</h2>
        <ul className="flex flex-wrap gap-2">
          {LINKS.map(([label, href]) => (
            <li key={label}>
              <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:ring-brand-500">
                {label} <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <MapPin className="size-3.5" aria-hidden /> Campus: Av. Prof. Roberto Frade Monte, 389 · Barretos-SP
      </p>
    </div>
  );
}
