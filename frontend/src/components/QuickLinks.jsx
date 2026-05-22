import { memo } from "react";

function QuickLinks({ links }) {
  return (
    <section className="quick-links">
      {links.map((link) => (
        <article key={link.id} className="quick-card">
          <div className="quick-icon">{link.icon}</div>
          <div>
            <h3>{link.title}</h3>
            <p>{link.subtitle}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

export default memo(QuickLinks);
