import rawExercises from "../../practices/exercise-rules.json";
import rawRelationships from "../../practices/exercise-relationships.json";
import rawCheckpoints from "../../practices/movement-checkpoints.json";
import {
   addDays,
   createSchedulerCache,
   getDayIndex,
   getPlanForDate,
   parseIsoDate,
   resolveTrainingDay,
   type CheckpointFile,
   type DailyPlan,
   type ExerciseFile,
   type SchedulerCache,
   SECTION_ORDER,
   type SectionKey,
   type SelectedExercise,
   type RelationshipFile
} from "./movement-core";

const exerciseFile = rawExercises as ExerciseFile;
const relationshipFile = rawRelationships as RelationshipFile;
const checkpointFile = rawCheckpoints as CheckpointFile;

const SECTION_META: Record<SectionKey, { title: string; description: string; empty: string }> = {
   flow: {
      title: "Flow",
      description: "Open the body and find rhythm.",
      empty: "No dedicated flow was due today."
   },
   main: {
      title: "Strength Work",
      description: "Primary work for the day.",
      empty: "No heavy main work needed today."
   },
   accessory: {
      title: "Support Work",
      description: "Reinforcing the day's strength work.",
      empty: "The mains covered the support work today."
   },
   conditioning: {
      title: "Conditioning",
      description: "Optional full-body conditioning.",
      empty: "Conditioning stayed in the background today."
   },
   micro: {
      title: "Micro Sessions",
      description: "Hit these regularly throughout the day.",
      empty: "Only walking is in play today."
   }
};

const SECTION_STYLES: Record<SectionKey, {
   wrapper: string;
   titleWrap: string;
   title: string;
   description: string;
   list: string;
   item: string;
   itemName: string;
   frequencyNote: string;
   empty: string;
}> = {
   flow: {
      wrapper: "rounded-md border border-dashed border-stone-300 bg-stone-50",
      titleWrap: "bg-slate-100 p-4 border-b border-stone-300 border-dashed rounded-t-md",
      title: "text-lg uppercase tracking-wide text-stone-950/80 font-semibold",
      description: "mt-1 text-sm text-stone-600",
      list: "m-4",
      item: "flex items-baseline justify-between gap-3 border-t border-stone-200 py-2 first:border-t-0 first:pt-0 last:pb-0",
      itemName: "font-medium text-stone-950 text-sm",
      frequencyNote: "text-xs text-stone-500",
      empty: "m-4 text-sm text-stone-600"
   },
   main: {
      wrapper: "rounded-md border border-dashed border-stone-300 bg-stone-50",
      titleWrap: "bg-mauve-100 p-4 border-b border-stone-300 border-dashed rounded-t-md",
      title: "text-lg uppercase tracking-wide text-stone-950/80 font-semibold",
      description: "mt-1 text-sm text-stone-600",
      list: "m-4",
      item: "flex items-baseline justify-between gap-3 border-t border-stone-200 py-2 first:border-t-0 first:pt-0 last:pb-0",
      itemName: "font-medium text-stone-950 text-sm",
      frequencyNote: "text-xs text-stone-500",
      empty: "m-4 text-sm text-stone-600"
   },
   accessory: {
      wrapper: "rounded-md border border-dashed border-stone-300 bg-stone-50",
      titleWrap: "bg-olive-100 p-4 border-b border-stone-300 border-dashed rounded-t-md",
      title: "text-lg uppercase tracking-wide text-stone-950/80 font-semibold",
      description: "mt-1 text-sm text-stone-600",
      list: "m-4",
      item: "flex items-baseline justify-between gap-3 border-t border-stone-200 py-2 first:border-t-0 first:pt-0 last:pb-0",
      itemName: "font-medium text-stone-950 text-sm",
      frequencyNote: "text-xs text-stone-500",
      empty: "m-4 text-sm text-stone-600"
   },
   conditioning: {
      wrapper: "rounded-md border border-dashed border-stone-300 bg-stone-50",
      titleWrap: "bg-neutral-100 p-4 border-b border-stone-300 border-dashed rounded-t-md",
      title: "text-lg uppercase tracking-wide text-stone-950/80 font-semibold",
      description: "mt-1 text-sm text-stone-600",
      list: "m-4",
      item: "flex items-baseline justify-between gap-3 border-t border-stone-200 py-2 first:border-t-0 first:pt-0 last:pb-0",
      itemName: "font-medium text-stone-950 text-sm",
      frequencyNote: "text-xs text-stone-500",
      empty: "m-4 text-sm text-stone-600"
   },
   micro: {
      wrapper: "rounded-md border border-dashed border-stone-300 bg-stone-50",
      titleWrap: "bg-neutral-100 p-4 border-b border-stone-300 border-dashed rounded-t-md",
      title: "text-lg uppercase tracking-wide text-stone-950/80 font-semibold",
      description: "mt-1 text-sm text-stone-600",
      list: "m-4",
      item: "flex items-baseline justify-between gap-3 border-t border-stone-200 py-2 first:border-t-0 first:pt-0 last:pb-0",
      itemName: "font-medium text-stone-950 text-sm",
      frequencyNote: "text-xs text-stone-500",
      empty: "m-4 text-sm text-stone-600"
   }
};

let schedulerCache: SchedulerCache | null = null;

function getSchedulerCache(targetDate: Date): SchedulerCache {
   if (!schedulerCache) {
      schedulerCache = createSchedulerCache(exerciseFile, relationshipFile, checkpointFile, targetDate);
   }
   return schedulerCache;
}

function formatOrdinalDay(day: number): string {
   const remainder = day % 100;
   if (remainder >= 11 && remainder <= 13) {
      return `${day}th`;
   }

   switch (day % 10) {
      case 1:
         return `${day}st`;
      case 2:
         return `${day}nd`;
      case 3:
         return `${day}rd`;
      default:
         return `${day}th`;
   }
}

function formatCycleStart(isoDate: string): string {
   const date = parseIsoDate(isoDate);
   const month = new Intl.DateTimeFormat("en-US", {month: "long"}).format(date);
   return `${month} ${formatOrdinalDay(date.getDate())}`;
}

function renderExercise(item: SelectedExercise, section: SectionKey): string {
   const styles = SECTION_STYLES[section];
   const frequencyNote = section === "micro" && item.exercise.rules.max_sessions_per_day > 1
       ? `<span class="${styles.frequencyNote}">up to ${item.exercise.rules.max_sessions_per_day}x today</span>`
       : "";

   return `
        <li class="${styles.item}">
            <p class="${styles.itemName}">${item.exercise.name}</p>
            ${frequencyNote}
        </li>
    `;
}

function renderSection(section: SectionKey, items: SelectedExercise[]): string {
   const meta = SECTION_META[section];
   const styles = SECTION_STYLES[section];
   const body = items.length > 0
       ? `<ol class="${styles.list}">${items.map((item) => renderExercise(item, section)).join("")}</ol>`
       : `<p class="${styles.empty}">${meta.empty}</p>`;

   return `
        <section class="${styles.wrapper}">
            <div class="${styles.titleWrap}">
                <h2 class="${styles.title}">${meta.title}</h2>
                <p class="${styles.description}">${meta.description}</p>
            </div>
            ${body}
        </section>
    `;
}

function renderPlan(root: HTMLElement, plan: DailyPlan, offset: number): void {
   const dateElement = root.querySelector<HTMLElement>("[data-movement-date]");
   const subtitleElement = root.querySelector<HTMLElement>("[data-movement-subtitle]");
   const cycleDayElement = root.querySelector<HTMLElement>("[data-movement-cycle-day]");
   const coverageElement = root.querySelector<HTMLElement>("[data-movement-coverage]");
   const cycleListElement = root.querySelector<HTMLElement>("[data-movement-cycle-list]");
   const overdueElement = root.querySelector<HTMLElement>("[data-movement-overdue]");
   const sectionsElement = root.querySelector<HTMLElement>("[data-movement-sections]");
   const offsetElement = root.querySelector<HTMLElement>("[data-movement-offset]");
   const previousButton = root.querySelector<HTMLButtonElement>("[data-movement-prev]");

   if (!dateElement || !subtitleElement || !cycleDayElement || !coverageElement || !cycleListElement || !overdueElement || !sectionsElement || !offsetElement) {
      return;
   }

   dateElement.textContent = `${plan.dayLabel}, ${plan.dateLabel}`;
   subtitleElement.textContent = offset === 0
       ? "This schedule refreshes at 6:00 AM local time."
       : `Viewing ${offset > 0 ? `${offset} day${offset === 1 ? "" : "s"} ahead` : `${Math.abs(offset)} day${Math.abs(offset) === 1 ? "" : "s"} back`} from today's schedule.`;
   offsetElement.textContent = offset === 0 ? "Today" : `${offset > 0 ? "+" : ""}${offset} day${Math.abs(offset) === 1 ? "" : "s"}`;
   cycleDayElement.textContent = `Day ${plan.cycle.dayNumber}`;
   const cycleStart = formatCycleStart(plan.cycle.startIsoDate);
   coverageElement.textContent = plan.cycle.completed
       ? `All ${plan.cycle.totalCount} exercises shown since ${cycleStart}.`
       : `${plan.cycle.uniqueCount}/${plan.cycle.totalCount} exercises since ${cycleStart}.`;
   const remainingNames = new Set(plan.cycle.missingExercises);
   cycleListElement.innerHTML = exerciseFile.exercises
       .map((exercise) => {
          const isRemaining = remainingNames.has(exercise.name);
          const classes = isRemaining
              ? "border border-olive-400 bg-olive-200/80 px-1.5 py-0.5 text-xs text-olive-800 rounded-sm"
              : "border border-dashed border-stone-300/70 bg-stone-50 px-1.5 py-0.5 text-xs text-stone-500 line-through opacity-65 decoration-px decoration-stone-400 rounded-sm";
          return `<span class="${classes}">${exercise.name}</span>`;
       })
       .join("");
   overdueElement.innerHTML = plan.coverage.overdueExercises.length > 0
       ? plan.coverage.overdueExercises.map((name) => `<span class="rounded-sm border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">${name}</span>`).join("")
       : `<span class="rounded-sm border border-stone-300 bg-stone-100 px-1.5 py-0.5 text-xs text-stone-700">nothing overdue</span>`;
   sectionsElement.innerHTML = SECTION_ORDER.map((section) => renderSection(section, plan.sections[section])).join("");

   if (previousButton) {
      previousButton.disabled = plan.dayIndex <= 0;
   }
}

export function buildSchedule(targetDate: Date): DailyPlan {
   return getPlanForDate(getSchedulerCache(targetDate), exerciseFile, relationshipFile, targetDate);
}

export function initMovementPractice(): void {
   const root = document.querySelector<HTMLElement>("[data-movement-practice]");
   if (!root) {
      return;
   }

   const today = resolveTrainingDay(new Date());
   const anchorDate = parseIsoDate(relationshipFile.go_live_date);
   const minimumOffset = -Math.max(0, getDayIndex(anchorDate, today));
   let offset = 0;

   const render = () => {
      const targetDate = addDays(today, offset);
      renderPlan(root, buildSchedule(targetDate), offset);
   };

   root.querySelector<HTMLElement>("[data-movement-prev]")?.addEventListener("click", () => {
      offset = Math.max(minimumOffset, offset - 1);
      render();
   });

   root.querySelector<HTMLElement>("[data-movement-next]")?.addEventListener("click", () => {
      offset += 1;
      render();
   });

   root.querySelector<HTMLElement>("[data-movement-today]")?.addEventListener("click", () => {
      offset = 0;
      render();
   });

   render();
}
