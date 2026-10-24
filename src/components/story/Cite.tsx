// A source mark (KTD4): the claim stays in the text, its source opens from a small mark. Phrasing content only
// (spans and a native popover), so it sits inside a <p> or <li> without breaking hydration.
import { useId } from 'react';
import './cite.css';

export default function Cite({ title, href, checked }: { title: string; href: string; checked?: string }) {
  const id = `cite-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <span className="cite">
      <button type="button" className="cite-mark" popoverTarget={id} aria-label={`Source: ${title}`}>
        <span aria-hidden="true">↗</span>
      </button>
      <span id={id} popover="auto" className="cite-pop">
        <a href={href} target="_blank" rel="noopener">
          {title}
        </a>
        {checked && <span className="cite-checked"> · checked {checked}</span>}
      </span>
    </span>
  );
}
