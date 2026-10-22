import { UnselectedClassCard } from "./UnselectedClassCard.jsx";
import { NeedFollowupCard } from "./NeedFollowupCard.jsx";
import { RegistrasiStatusDistributionChart } from "./RegistrasiStatusDistributionChart.jsx";

export function RegistrasiSummaryGrid({ summary, batchLabel = "Batch 14" }) {
  const unselected = summary?.unselected || {};
  const followup = summary?.followup || {};

  const waitCount = unselected.waitCount ?? 0;
  const pendingCount = unselected.pendingCount ?? 0;
  const notConfirmCount = unselected.notConfirmCount ?? 0;
  const cancelCount = unselected.cancelCount ?? 0;
  const deleteCount = unselected.deleteCount ?? 0;
  const confirmedCount = unselected.selectedCount ?? 0;
  const totalBatch = unselected.totalBatchStudents ?? 0;

  return (
    <div className="space-y-space-md">
      {/* 1. Barisan Kartu KPI Utama */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        <UnselectedClassCard
          count={unselected.count}
          totalBatchStudents={unselected.totalBatchStudents}
          percentage={unselected.percentage}
          selectedCount={unselected.selectedCount}
          batchLabel={batchLabel}
        />
        <NeedFollowupCard
          urgentCount={followup.urgentCount}
          pendingPercentage={followup.pendingPercentage}
          label={followup.label}
          criteria={followup.criteria}
        />
      </section>

      {/* 2. Visualisasi Distribusi Status Pendaftaran Keseluruhan (Donut & Segmented Progress) */}
      <RegistrasiStatusDistributionChart
        waitCount={waitCount}
        pendingCount={pendingCount}
        notConfirmCount={notConfirmCount}
        cancelCount={cancelCount}
        deleteCount={deleteCount}
        confirmedCount={confirmedCount}
        totalBatch={totalBatch}
        batchLabel={batchLabel}
      />
    </div>
  );
}

