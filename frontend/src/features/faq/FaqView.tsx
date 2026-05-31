import {
  faqPieces,
  formatPieceName,
  formatRole,
  getDomainInfoByName,
  getPieceImageByName,
  getTechniqueInfoByKey,
  statusCatalog,
  type AbilityInfo,
} from "../../lib/presentation";

type Props = {
  onBack: () => void;
};

function FigureSigil({ tone }: { tone: "pink" | "blue" }) {
  const stroke = tone === "pink" ? "#ff83bf" : "#87ebff";
  const glow = tone === "pink" ? "rgba(255,131,191,0.18)" : "rgba(135,235,255,0.18)";

  return (
    <svg viewBox="0 0 120 120" className="faq-sigil" aria-hidden="true">
      <circle cx="60" cy="60" r="44" fill={glow} />
      <circle cx="60" cy="60" r="34" fill="none" stroke={stroke} strokeWidth="1.4" opacity="0.35" />
      <path d="M45 18 H75 L84 30 V90 H36 V30 Z" fill="none" stroke={stroke} strokeWidth="4" />
      <path d="M49 90 H71 L77 104 H43 Z" fill="none" stroke={stroke} strokeWidth="4" />
      <path d="M52 10 H68" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function AbilityCard({
  title,
  owner,
  image,
  ability,
  accent,
}: {
  title: string;
  owner: string;
  image: string;
  ability: AbilityInfo;
  accent: "technique" | "domain";
}) {
  return (
    <article className={`faq-ability-card faq-ability-card--${accent}`}>
      <div className="faq-ability-card__media">
        <div className="faq-ability-card__halo" />
        <img src={image} alt={owner} />
      </div>
      <div className="faq-ability-card__body">
        <div className="faq-ability-card__eyebrow">
          <span>{title}</span>
          <strong>{ability.cost === null ? "Без затрат" : `${ability.cost} энергии`}</strong>
        </div>
        <h3>{ability.label}</h3>
        <div className="faq-ability-card__owner">{owner}</div>
        <p>{ability.summary}</p>
        <div className="faq-ability-card__hint">{ability.usage}</div>
      </div>
    </article>
  );
}

export function FaqView({ onBack }: Props) {
  const techniqueEntries = faqPieces.flatMap((piece) =>
    piece.techniqueKeys
      .map((techniqueKey) => {
        const info = getTechniqueInfoByKey(techniqueKey);
        if (!info) {
          return null;
        }
        return {
          id: `${piece.name}-${techniqueKey}`,
          owner: formatPieceName(piece.name),
          image: getPieceImageByName(piece.name, "white"),
          ability: info,
        };
      })
      .filter(Boolean) as Array<{ id: string; owner: string; image: string; ability: AbilityInfo }>,
  );

  const domainEntries = faqPieces
    .map((piece) => {
      if (!piece.domainName) {
        return null;
      }
      const info = getDomainInfoByName(piece.domainName);
      if (!info) {
        return null;
      }
      return {
        id: `${piece.name}-domain`,
        owner: formatPieceName(piece.name),
        image: getPieceImageByName(piece.name, "white"),
        ability: info,
      };
    })
    .filter(Boolean) as Array<{ id: string; owner: string; image: string; ability: AbilityInfo }>;

  return (
    <section className="faq-page">
      <section className="panel panel--major faq-hero">
        <div className="faq-hero__copy">
          <div className="faq-hero__eyebrow">Справочник Партии</div>
          <h1>FAQ: Фигуры, Техники, РТ и Статусы</h1>
          <p>
            Полный справочник по правилам поля: кто за что отвечает, как работают статус-эффекты, что именно делает каждая
            техника и чем отличаются расширения территории.
          </p>
          <div className="faq-hero__actions">
            <a href="#faq-pieces" className="accent-button faq-link-button">
              Фигуры
            </a>
            <a href="#faq-techniques" className="faq-link-button">
              Техники
            </a>
            <a href="#faq-domains" className="faq-link-button">
              РТ
            </a>
            <a href="#faq-statuses" className="faq-link-button">
              Статусы
            </a>
            <button className="ghost" onClick={onBack}>
              Назад В Лобби
            </button>
          </div>
        </div>
        <div className="faq-hero__art">
          <FigureSigil tone="pink" />
          <FigureSigil tone="blue" />
          <FigureSigil tone="pink" />
        </div>
      </section>

      <section className="panel panel--major faq-section" id="faq-pieces">
        <div className="section-head">
          <h2>Фигуры</h2>
        </div>
        <div className="faq-piece-grid">
          {faqPieces.map((piece, index) => {
            const image = getPieceImageByName(piece.name, "white");
            const techniqueNames = piece.techniqueKeys
              .map((key) => getTechniqueInfoByKey(key)?.label)
              .filter(Boolean)
              .join(" · ");
            const domainName = piece.domainName ? getDomainInfoByName(piece.domainName)?.label : null;
            return (
              <article key={piece.name} className="faq-piece-card">
                <div className="faq-piece-card__art">
                  <div className={`faq-piece-card__glow faq-piece-card__glow--${index % 2 === 0 ? "pink" : "blue"}`} />
                  <img src={image} alt={formatPieceName(piece.name)} />
                </div>
                <div className="faq-piece-card__body">
                  <div className="faq-piece-card__role">
                    <span>{formatRole(piece.role)}</span>
                  </div>
                  <h3>{formatPieceName(piece.name)}</h3>
                  <p>{piece.summary}</p>
                  <div className="faq-piece-card__meta">
                    {techniqueNames ? <span>Техника: {techniqueNames}</span> : <span>Техника: через копирование</span>}
                    {domainName ? <span>РТ: {domainName}</span> : <span>РТ: отсутствует</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel panel--major faq-section" id="faq-techniques">
        <div className="section-head">
          <h2>Техники</h2>
        </div>
        <div className="faq-ability-grid">
          {techniqueEntries.map((entry) => (
            <AbilityCard key={entry.id} title="Техника" owner={entry.owner} image={entry.image} ability={entry.ability} accent="technique" />
          ))}
        </div>
      </section>

      <section className="panel panel--major faq-section" id="faq-domains">
        <div className="section-head">
          <h2>Расширения Территории</h2>
        </div>
        <div className="faq-ability-grid">
          {domainEntries.map((entry) => (
            <AbilityCard key={entry.id} title="РТ" owner={entry.owner} image={entry.image} ability={entry.ability} accent="domain" />
          ))}
        </div>
      </section>

      <section className="panel panel--major faq-section" id="faq-statuses">
        <div className="section-head">
          <h2>Статус-Эффекты</h2>
        </div>
        <div className="faq-status-grid">
          {statusCatalog.map((status, index) => (
            <article key={status.kind} className="faq-status-card">
              <div className={`faq-status-card__dot faq-status-card__dot--${index % 2 === 0 ? "pink" : "blue"}`} />
              <h3>{status.label}</h3>
              <p>{status.description}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

