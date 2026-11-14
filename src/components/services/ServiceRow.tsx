import type { Service } from "@/config/services";

/** One full-width service row. State is shown via data-active (set by the controller). */
export function ServiceRow({ service }: { service: Service }) {
  return (
    <li className="zorx-service-row" data-service={service.id}>
      <button type="button" className="zorx-service-button" aria-pressed="false">
        <span className="zorx-service-label">{service.label}</span>
      </button>
    </li>
  );
}
