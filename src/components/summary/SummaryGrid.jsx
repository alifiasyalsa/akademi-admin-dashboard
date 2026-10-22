import { AttendanceCard } from "./AttendanceCard.jsx";
import { InfaqCard } from "./InfaqCard.jsx";
import { PromotedCard } from "./PromotedCard.jsx";

export function SummaryGrid({ attendance, infaq, promoted }) {
  return (
    <section className={`grid grid-cols-1 ${promoted ? "md:grid-cols-3" : "md:grid-cols-2"} gap-space-lg`}>
      <AttendanceCard attendance={attendance} />
      <InfaqCard infaq={infaq} />
      {promoted && <PromotedCard promoted={promoted} />}
    </section>
  );
}
