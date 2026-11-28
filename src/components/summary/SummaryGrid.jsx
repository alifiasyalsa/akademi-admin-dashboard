import { AttendanceCard } from "./AttendanceCard.jsx";
import { InfaqCard } from "./InfaqCard.jsx";
import { PromotedCard } from "./PromotedCard.jsx";

export function SummaryGrid({ attendance, infaq, promoted }) {
  return (
    <section className={`grid grid-cols-1 sm:grid-cols-2 ${promoted ? "lg:grid-cols-3" : ""} gap-3 sm:gap-space-lg`}>
      <AttendanceCard attendance={attendance} />
      <InfaqCard infaq={infaq} />
      {promoted && <PromotedCard promoted={promoted} />}
    </section>
  );
}
