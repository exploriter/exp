import rawExercises from "../../practices/exercise-rules.json";
import rawRelationships from "../../practices/exercise-relationships.json";

type SectionKey = "flow" | "main" | "accessory" | "conditioning" | "micro";
type MovementZone = "upper" | "lower" | "neutral";
type IntensityTier = "low" | "medium" | "high";

interface ExerciseRules {
   min_rest_days_between_sessions: number;
   max_rest_days_between_sessions: number;
   max_sessions_per_day: number;
   target_sessions_per_week: number;
}

interface RawExercise {
   name: string;
   category: string;
   rules: ExerciseRules;
}

interface ExerciseFile {
   categories: string[];
   exercises: RawExercise[];
}

interface SlotAffinity {
   flow?: number;
   main?: number;
   accessory?: number;
   conditioning?: number;
   micro?: number;
}

interface RelationshipProfile {
   movement_zone?: MovementZone;
   slot_affinity?: SlotAffinity;
   movement_patterns?: string[];
   stress_tags?: string[];
   support_tags?: string[];
   intensity_tier?: IntensityTier;
   load_score?: number;
   pair_well_with?: string[];
   avoid_with?: string[];
}

interface RelationshipFile {
   go_live_date: string;
   coverage_window_days: number;
   session_load_cap: number;
   category_profiles: Record<string, RelationshipProfile>;
   exercise_overrides: Record<string, RelationshipProfile>;
}

interface Exercise extends RawExercise {
   metadata: {
      movementZone: MovementZone;
      slotAffinity: Record<SectionKey, number>;
      movementPatterns: string[];
      stressTags: string[];
      supportTags: string[];
      intensityTier: IntensityTier;
      loadScore: number;
      pairWellWith: string[];
      avoidWith: string[];
   };
}

interface SelectionReason {
   label: string;
   tone: "stone" | "emerald" | "amber";
}

interface SelectedExercise {
   exercise: Exercise;
   reasons: SelectionReason[];
}

interface DailyPlan {
   dayIndex: number;
   isoDate: string;
   dateLabel: string;
   dayLabel: string;
   sections: Record<SectionKey, SelectedExercise[]>;
   cycle: {
      cycleNumber: number;
      startIsoDate: string;
      dayNumber: number;
      uniqueCount: number;
      totalCount: number;
      missingExercises: string[];
      completed: boolean;
   };
   coverage: {
      uniqueCount: number;
      totalCount: number;
      missingExercises: string[];
      overdueExercises: string[];
   };
}

interface ScheduleState {
   lastSeen: Map<string, number>;
   appearances: Map<string, number[]>;
   plans: DailyPlan[];
   cycle: {
      cycleNumber: number;
      startDayIndex: number;
      seenExercises: Set<string>;
   };
}

const exerciseFile = rawExercises as ExerciseFile;
const relationshipFile = rawRelationships as RelationshipFile;

const SECTION_ORDER: SectionKey[] = ["flow", "main", "accessory", "conditioning", "micro"];
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
      empty: "mt-4 text-sm text-stone-600"
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
      empty: "mt-4 text-sm text-stone-600"
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
      empty: "mt-4 text-sm text-stone-600"
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
      empty: "mt-4 text-sm text-stone-600"
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
      empty: "mt-4 text-sm text-stone-600"
   }
};

const SUPPORT_TARGETS: Record<string, string[]> = {
   ankle_strength: ["calves", "shins", "quads"],
   anterior_core: ["core", "hip_flexors"],
   balance: ["quads", "glutes", "core"],
   circulation: ["cardio", "cardio_light"],
   coordination: ["cardio_light", "shoulders"],
   core_bracing: ["core", "low_back"],
   decompression: ["low_back", "shoulders", "grip"],
   footwork: ["calves", "cardio", "shins"],
   gait_support: ["hip_flexors", "quads"],
   grip_strength: ["grip", "forearms"],
   hip_power: ["hamstrings", "glutes", "cardio"],
   joint_prep: ["shoulders", "quads", "low_back"],
   joint_support: ["shoulders", "low_back", "knees"],
   knee_capacity: ["quads", "glutes"],
   knee_stability: ["quads", "glutes"],
   lower_body_balance: ["quads", "hamstrings", "glutes"],
   lower_leg_balance: ["calves", "shins"],
   neck_strength: ["neck"],
   overhead_balance: ["shoulders", "upper_back", "lats"],
   posterior_chain_strength: ["hamstrings", "glutes", "low_back", "grip"],
   posterior_support: ["hamstrings", "glutes"],
   posture: ["upper_back", "shoulders", "neck"],
   pressing_strength: ["shoulders", "triceps", "chest"],
   pressing_support: ["triceps", "shoulders", "chest"],
   pullingsupport: ["biceps", "upper_back", "grip"],
   pulling_support: ["biceps", "upper_back", "grip"],
   quad_support: ["quads"],
   recovery: ["cardio", "cardio_light", "low_back"],
   rotational_power: ["core", "shoulders", "cardio"],
   scapular_control: ["upper_back", "shoulders"],
   scapular_stability: ["upper_back", "shoulders"],
   shoulder_health: ["shoulders", "upper_back"],
   shoulder_support: ["shoulders"],
   spinal_control: ["core", "low_back"],
   stance_endurance: ["quads", "adductors"],
   thoracic_mobility: ["shoulders", "upper_back"],
   unilateral_strength: ["quads", "glutes", "core"],
   work_capacity: ["cardio", "cardio_light"]
};

function mergeStringLists(...lists: Array<string[] | undefined>): string[] {
   return [...new Set(lists.flatMap((list) => list ?? []))];
}

function buildSlotAffinity(profile: RelationshipProfile, override: RelationshipProfile, exercise: RawExercise): Record<SectionKey, number> {
   const affinity: Record<SectionKey, number> = {
      flow: 0,
      main: 0,
      accessory: 0,
      conditioning: 0,
      micro: 0
   };

   for (const source of [profile.slot_affinity, override.slot_affinity]) {
      if (!source) {
         continue;
      }

      for (const section of SECTION_ORDER) {
         if (source[section] !== undefined) {
            affinity[section] = source[section] ?? 0;
         }
      }
   }

   if (exercise.rules.max_sessions_per_day > 1) {
      affinity.micro = Math.max(affinity.micro, 1);
   }

   // Flow is reserved for exercises explicitly categorized as Flow.
   if (exercise.category !== "Flow") {
      affinity.flow = 0;
   }

   // Conditioning is reserved for exercises explicitly categorized as Conditioning.
   if (exercise.category !== "Conditioning") {
      affinity.conditioning = 0;
   }

   return affinity;
}

function buildCatalog(): Exercise[] {
   return exerciseFile.exercises.map((exercise) => {
      const profile = relationshipFile.category_profiles[exercise.category] ?? {};
      const override = relationshipFile.exercise_overrides[exercise.name] ?? {};

      return {
         ...exercise,
         metadata: {
            movementZone: override.movement_zone ?? profile.movement_zone ?? "neutral",
            slotAffinity: buildSlotAffinity(profile, override, exercise),
            movementPatterns: mergeStringLists(profile.movement_patterns, override.movement_patterns),
            stressTags: mergeStringLists(profile.stress_tags, override.stress_tags),
            supportTags: mergeStringLists(profile.support_tags, override.support_tags),
            intensityTier: override.intensity_tier ?? profile.intensity_tier ?? "medium",
            loadScore: override.load_score ?? profile.load_score ?? 1,
            pairWellWith: mergeStringLists(profile.pair_well_with, override.pair_well_with),
            avoidWith: mergeStringLists(profile.avoid_with, override.avoid_with)
         }
      };
   });
}

function expandSupportTargets(supportTags: string[]): string[] {
   return [...new Set(supportTags.flatMap((tag) => SUPPORT_TARGETS[tag] ?? [tag]))];
}

function hashNumber(input: string): number {
   let hash = 2166136261;
   for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
   }

   return (hash >>> 0) / 4294967295;
}

function addDays(date: Date, days: number): Date {
   const next = new Date(date);
   next.setDate(next.getDate() + days);
   return next;
}

function startOfDay(date: Date): Date {
   return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toIsoDate(date: Date): string {
   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, "0");
   const day = String(date.getDate()).padStart(2, "0");
   return `${year}-${month}-${day}`;
}

function parseIsoDate(isoDate: string): Date {
   const [year, month, day] = isoDate.split("-").map(Number);
   return new Date(year, month - 1, day);
}

function resolveTrainingDay(now: Date): Date {
   const scheduledDay = startOfDay(now);
   if (now.getHours() < 6) {
      scheduledDay.setDate(scheduledDay.getDate() - 1);
   }
   return scheduledDay;
}

function getDayIndex(anchorDate: Date, targetDate: Date): number {
   const anchorUtc = Date.UTC(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate());
   const targetUtc = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
   const millisecondsPerDay = 24 * 60 * 60 * 1000;
   return Math.floor((targetUtc - anchorUtc) / millisecondsPerDay);
}

function getAppearances(state: ScheduleState, exerciseName: string): number[] {
   return state.appearances.get(exerciseName) ?? [];
}

function getLastSeen(state: ScheduleState, exerciseName: string): number | null {
   return state.lastSeen.get(exerciseName) ?? null;
}

function getRecentCount(appearances: number[], dayIndex: number, windowDays: number): number {
   const minDay = dayIndex - windowDays + 1;
   return appearances.filter((appearance) => appearance >= minDay && appearance <= dayIndex).length;
}

function getGapSinceLast(lastSeen: number | null, dayIndex: number): number {
   return lastSeen === null ? dayIndex + 1 : dayIndex - lastSeen;
}

function isEligible(exercise: Exercise, state: ScheduleState, dayIndex: number): boolean {
   const lastSeen = getLastSeen(state, exercise.name);
   if (lastSeen === null) {
      return true;
   }
   return dayIndex - lastSeen > exercise.rules.min_rest_days_between_sessions;
}

function computeUrgency(exercise: Exercise, state: ScheduleState, dayIndex: number): number {
   const appearances = getAppearances(state, exercise.name);
   const lastSeen = getLastSeen(state, exercise.name);
   const gap = getGapSinceLast(lastSeen, dayIndex);
   const recentWeekCount = getRecentCount(appearances, dayIndex - 1, 7);
   const idealInterval = Math.max(1, 7 / exercise.rules.target_sessions_per_week);
   const targetGap = Math.max(0, exercise.rules.target_sessions_per_week - recentWeekCount);
   const coverageWindowDays = relationshipFile.coverage_window_days;
   const remainingCoverageDays = coverageWindowDays - gap;

   let urgency = 0;

   if (lastSeen === null) {
      urgency += 6 + ((dayIndex + 1) / coverageWindowDays) * 6;
   }

   urgency += gap / idealInterval;
   urgency += targetGap * 1.5;

   if (gap > exercise.rules.max_rest_days_between_sessions) {
      urgency += 8 + (gap - exercise.rules.max_rest_days_between_sessions) * 2;
   }

   if (remainingCoverageDays <= 3) {
      urgency += (4 - remainingCoverageDays) * 4;
   }

   return urgency;
}

function computeCompatibility(exercise: Exercise, slot: SectionKey, selected: SelectedExercise[]): number {
   const selectedNames = new Set(selected.map((item) => item.exercise.name));
   const mainSelections = selected.filter((item) => item.exercise.metadata.slotAffinity.main >= 3);
   const supportTargets = expandSupportTargets(exercise.metadata.supportTags);
   let score = 0;

   for (const item of selected) {
      const selectedExercise = item.exercise;
      const stressOverlap = selectedExercise.metadata.stressTags.filter((tag) => exercise.metadata.stressTags.includes(tag)).length;
      const supportOverlap = supportTargets.filter((tag) => selectedExercise.metadata.stressTags.includes(tag)).length;
      const reverseSupportOverlap = expandSupportTargets(selectedExercise.metadata.supportTags)
          .filter((tag) => exercise.metadata.stressTags.includes(tag)).length;

      score -= stressOverlap * 0.9;
      score += supportOverlap * 1.6;
      score += reverseSupportOverlap * 0.8;

      if (exercise.metadata.pairWellWith.includes(selectedExercise.name)) {
         score += 2.5;
      }

      if (selectedExercise.metadata.pairWellWith.includes(exercise.name)) {
         score += 1.5;
      }

      if (exercise.metadata.avoidWith.includes(selectedExercise.name) || selectedExercise.metadata.avoidWith.includes(exercise.name)) {
         score -= 5;
      }
   }

   if (slot === "main" && mainSelections.length === 1) {
      const currentMain = mainSelections[0].exercise;
      if (currentMain.metadata.movementZone !== exercise.metadata.movementZone) {
         score += 3;
      } else {
         score -= 1;
      }

      const sharedPatterns = currentMain.metadata.movementPatterns.filter((pattern) => exercise.metadata.movementPatterns.includes(pattern));
      score -= sharedPatterns.length * 1.5;
   }

   if (slot === "accessory") {
      const mainStress = mainSelections.flatMap((item) => item.exercise.metadata.stressTags);
      const supportedMainStress = supportTargets.filter((tag) => mainStress.includes(tag)).length;
      score += supportedMainStress * 2;
   }

   if (slot === "conditioning") {
      const hasHeavyHinge = mainSelections.some((item) =>
          item.exercise.metadata.movementPatterns.includes("hinge") && item.exercise.metadata.intensityTier === "high"
      );

      if (hasHeavyHinge && exercise.metadata.movementPatterns.includes("hinge")) {
         score -= 4;
      }
   }

   if (!selectedNames.has("Walking") && exercise.name === "Walking") {
      score += 8;
   }

   return score;
}

function computeSlotScore(exercise: Exercise, slot: SectionKey, state: ScheduleState, selected: SelectedExercise[], dayIndex: number): number {
   if (!isEligible(exercise, state, dayIndex)) {
      return Number.NEGATIVE_INFINITY;
   }

   const slotWeight = exercise.metadata.slotAffinity[slot];
   if (slotWeight <= 0) {
      return Number.NEGATIVE_INFINITY;
   }

   const urgency = computeUrgency(exercise, state, dayIndex);
   const compatibility = computeCompatibility(exercise, slot, selected);
   const tieBreaker = hashNumber(`${relationshipFile.go_live_date}:${dayIndex}:${slot}:${exercise.name}`);

   return urgency * slotWeight + compatibility + tieBreaker;
}

function buildReasons(exercise: Exercise, slot: SectionKey, state: ScheduleState, dayIndex: number, selected: SelectedExercise[]): SelectionReason[] {
   const lastSeen = getLastSeen(state, exercise.name);
   const gap = getGapSinceLast(lastSeen, dayIndex);
   const reasons: SelectionReason[] = [];

   if (exercise.name === "Walking") {
      reasons.push({label: "daily anchor", tone: "stone"});
   }

   if (gap > exercise.rules.max_rest_days_between_sessions) {
      reasons.push({label: "due again", tone: "amber"});
   }

   if (slot === "accessory") {
      const mainStress = selected
          .filter((item) => item.exercise.metadata.slotAffinity.main >= 3)
          .flatMap((item) => item.exercise.metadata.stressTags);
      if (expandSupportTargets(exercise.metadata.supportTags).some((tag) => mainStress.includes(tag))) {
         reasons.push({label: "supports main work", tone: "emerald"});
      }
   }

   return reasons.slice(0, 2);
}

function addAppearance(state: ScheduleState, exerciseName: string, dayIndex: number): void {
   const appearances = getAppearances(state, exerciseName);
   appearances.push(dayIndex);
   state.appearances.set(exerciseName, appearances);
   state.lastSeen.set(exerciseName, dayIndex);
}

function getCoverage(state: ScheduleState, exercises: Exercise[], dayIndex: number): DailyPlan["coverage"] {
   const minDay = Math.max(0, dayIndex - relationshipFile.coverage_window_days + 1);
   const seenWithinWindow = new Set<string>();
   const overdueExercises: string[] = [];

   for (const exercise of exercises) {
      const appearances = getAppearances(state, exercise.name);
      if (appearances.some((appearance) => appearance >= minDay && appearance <= dayIndex)) {
         seenWithinWindow.add(exercise.name);
      }

      const gap = getGapSinceLast(getLastSeen(state, exercise.name), dayIndex);
      if (gap > exercise.rules.max_rest_days_between_sessions) {
         overdueExercises.push(exercise.name);
      }
   }

   return {
      uniqueCount: seenWithinWindow.size,
      totalCount: exercises.length,
      missingExercises: exercises
          .map((exercise) => exercise.name)
          .filter((exerciseName) => !seenWithinWindow.has(exerciseName)),
      overdueExercises
   };
}

function selectExercise(
    sections: Record<SectionKey, SelectedExercise[]>,
    section: SectionKey,
    exercise: Exercise,
    state: ScheduleState,
    dayIndex: number
): SelectedExercise {
   const selected = SECTION_ORDER.flatMap((slot) => sections[slot]);
   const selection: SelectedExercise = {
      exercise,
      reasons: buildReasons(exercise, section, state, dayIndex, selected)
   };
   sections[section].push(selection);
   return selection;
}

function getSelectedNames(sections: Record<SectionKey, SelectedExercise[]>): Set<string> {
   return new Set(SECTION_ORDER.flatMap((section) => sections[section].map((item) => item.exercise.name)));
}

function getCurrentLoad(sections: Record<SectionKey, SelectedExercise[]>): number {
   return SECTION_ORDER.reduce((load, section) => {
      return load + sections[section].reduce((sectionLoad, item) => {
         const multiplier = section === "micro" ? 0.5 : 1;
         return sectionLoad + item.exercise.metadata.loadScore * multiplier;
      }, 0);
   }, 0);
}

function pickBestExercise(
    exercises: Exercise[],
    section: SectionKey,
    state: ScheduleState,
    sections: Record<SectionKey, SelectedExercise[]>,
    dayIndex: number,
    predicate: (exercise: Exercise) => boolean
): Exercise | null {
   const selected = SECTION_ORDER.flatMap((slot) => sections[slot]);
   const selectedNames = getSelectedNames(sections);
   const scored = exercises
       .filter((exercise) => !selectedNames.has(exercise.name))
       .filter(predicate)
       .map((exercise) => ({
          exercise,
          score: computeSlotScore(exercise, section, state, selected, dayIndex)
       }))
       .filter((entry) => Number.isFinite(entry.score))
       .sort((left, right) => right.score - left.score);

   return scored[0]?.exercise ?? null;
}

function shouldAllowHeavyDay(sections: Record<SectionKey, SelectedExercise[]>): boolean {
   return !sections.main.some((item) => item.exercise.metadata.intensityTier === "high");
}

function buildDayPlan(dayIndex: number, date: Date, exercises: Exercise[], state: ScheduleState): DailyPlan {
   const sections: Record<SectionKey, SelectedExercise[]> = {
      flow: [],
      main: [],
      accessory: [],
      conditioning: [],
      micro: []
   };
   const loadCap = relationshipFile.session_load_cap;
   const isoDate = toIsoDate(date);
   const dateLabel = new Intl.DateTimeFormat("en-US", {month: "long", day: "numeric", year: "numeric"}).format(date);
   const dayLabel = new Intl.DateTimeFormat("en-US", {weekday: "long"}).format(date);

   const walking = exercises.find((exercise) => exercise.name === "Walking");
   if (walking) {
      selectExercise(sections, "micro", walking, state, dayIndex);
   }

   const upperMain = pickBestExercise(
       exercises,
       "main",
       state,
       sections,
       dayIndex,
       (exercise) => exercise.metadata.movementZone === "upper" && exercise.metadata.slotAffinity.main >= 3
   );
   if (upperMain) {
      selectExercise(sections, "main", upperMain, state, dayIndex);
   }

   const lowerMain = pickBestExercise(
       exercises,
       "main",
       state,
       sections,
       dayIndex,
       (exercise) => exercise.metadata.movementZone === "lower" && exercise.metadata.slotAffinity.main >= 3
   );
   if (lowerMain && (getCurrentLoad(sections) + lowerMain.metadata.loadScore <= loadCap || sections.main.length === 0)) {
      selectExercise(sections, "main", lowerMain, state, dayIndex);
   }

   if (sections.main.length === 0) {
      const fallbackMain = pickBestExercise(
          exercises,
          "main",
          state,
          sections,
          dayIndex,
          (exercise) => exercise.metadata.slotAffinity.main >= 3
      );
      if (fallbackMain) {
         selectExercise(sections, "main", fallbackMain, state, dayIndex);
      }
   }

   const desiredMainCount = shouldAllowHeavyDay(sections) && hashNumber(`${isoDate}:main-volume`) > 0.62 ? 3 : 2;
   while (sections.main.length < desiredMainCount && getCurrentLoad(sections) < loadCap - 1) {
      const nextMain = pickBestExercise(
          exercises,
          "main",
          state,
          sections,
          dayIndex,
          (exercise) => exercise.metadata.slotAffinity.main >= 3
      );
      if (!nextMain) {
         break;
      }

      const nextScore = computeSlotScore(nextMain, "main", state, SECTION_ORDER.flatMap((section) => sections[section]), dayIndex);
      if (nextScore < 12) {
         break;
      }

      if (getCurrentLoad(sections) + nextMain.metadata.loadScore > loadCap) {
         break;
      }

      selectExercise(sections, "main", nextMain, state, dayIndex);
   }

   const desiredFlowCount = hashNumber(`${isoDate}:flow-volume`) > 0.45 ? 2 : 1;
   while (sections.flow.length < desiredFlowCount) {
      const flowExercise = pickBestExercise(
          exercises,
          "flow",
          state,
          sections,
          dayIndex,
          (exercise) => exercise.metadata.slotAffinity.flow >= 1
      );
      if (!flowExercise) {
         break;
      }
      selectExercise(sections, "flow", flowExercise, state, dayIndex);
   }

   const desiredAccessoryCount = hashNumber(`${isoDate}:accessory-volume`) > 0.63 ? 3 : 2;
   while (sections.accessory.length < desiredAccessoryCount) {
      const accessory = pickBestExercise(
          exercises,
          "accessory",
          state,
          sections,
          dayIndex,
          (exercise) => exercise.metadata.slotAffinity.accessory >= 2
      );
      if (!accessory) {
         break;
      }

      const score = computeSlotScore(accessory, "accessory", state, SECTION_ORDER.flatMap((section) => sections[section]), dayIndex);
      const mustFillFirstAccessory = sections.accessory.length === 0;
      if (!mustFillFirstAccessory && score < 9) {
         break;
      }

      if (getCurrentLoad(sections) + accessory.metadata.loadScore > loadCap + 1) {
         break;
      }

      selectExercise(sections, "accessory", accessory, state, dayIndex);
   }

   const conditioning = pickBestExercise(
       exercises,
       "conditioning",
       state,
       sections,
       dayIndex,
       (exercise) => exercise.name !== "Walking" && exercise.metadata.slotAffinity.conditioning >= 2
   );
   if (conditioning) {
      const conditioningScore = computeSlotScore(conditioning, "conditioning", state, SECTION_ORDER.flatMap((section) => sections[section]), dayIndex);
      if (conditioningScore >= 10 && getCurrentLoad(sections) + conditioning.metadata.loadScore <= loadCap + 1) {
         selectExercise(sections, "conditioning", conditioning, state, dayIndex);
      }
   }

   const desiredMicroExtras = hashNumber(`${isoDate}:micro-volume`) > 0.78 ? 2 : 1;
   while (sections.micro.length < desiredMicroExtras + (walking ? 1 : 0)) {
      const micro = pickBestExercise(
          exercises,
          "micro",
          state,
          sections,
          dayIndex,
          (exercise) => exercise.name !== "Walking" && exercise.rules.max_sessions_per_day > 1
      );
      if (!micro) {
         break;
      }

      const microScore = computeSlotScore(micro, "micro", state, SECTION_ORDER.flatMap((section) => sections[section]), dayIndex);
      if (microScore < 8.5) {
         break;
      }

      selectExercise(sections, "micro", micro, state, dayIndex);
   }

   for (const section of SECTION_ORDER) {
      for (const item of sections[section]) {
         addAppearance(state, item.exercise.name, dayIndex);
      }
   }

   return {
      dayIndex,
      isoDate,
      dateLabel,
      dayLabel,
      sections,
      cycle: {
         cycleNumber: state.cycle.cycleNumber,
         startIsoDate: isoDate,
         dayNumber: 1,
         uniqueCount: 0,
         totalCount: exercises.length,
         missingExercises: exercises.map((exercise) => exercise.name),
         completed: false
      },
      coverage: getCoverage(state, exercises, dayIndex)
   };
}

export function buildSchedule(targetDate: Date): DailyPlan {
   const anchorDate = parseIsoDate(relationshipFile.go_live_date);
   const normalizedTargetDate = startOfDay(targetDate);
   const finalDayIndex = Math.max(0, getDayIndex(anchorDate, normalizedTargetDate));
   const exercises = buildCatalog();
   const state: ScheduleState = {
      lastSeen: new Map<string, number>(),
      appearances: new Map<string, number[]>(),
      plans: [],
      cycle: {
         cycleNumber: 1,
         startDayIndex: 0,
         seenExercises: new Set<string>()
      }
   };

   for (let dayIndex = 0; dayIndex <= finalDayIndex; dayIndex += 1) {
      const date = addDays(anchorDate, dayIndex);
      const plan = buildDayPlan(dayIndex, date, exercises, state);

      for (const section of SECTION_ORDER) {
         for (const item of plan.sections[section]) {
            state.cycle.seenExercises.add(item.exercise.name);
         }
      }

      plan.cycle = {
         cycleNumber: state.cycle.cycleNumber,
         startIsoDate: toIsoDate(addDays(anchorDate, state.cycle.startDayIndex)),
         dayNumber: dayIndex - state.cycle.startDayIndex + 1,
         uniqueCount: state.cycle.seenExercises.size,
         totalCount: exercises.length,
         missingExercises: exercises
             .map((exercise) => exercise.name)
             .filter((exerciseName) => !state.cycle.seenExercises.has(exerciseName)),
         completed: state.cycle.seenExercises.size === exercises.length
      };

      state.plans.push(plan);

      if (plan.cycle.completed) {
         state.cycle = {
            cycleNumber: state.cycle.cycleNumber + 1,
            startDayIndex: dayIndex + 1,
            seenExercises: new Set<string>()
         };
      }
   }

   return state.plans[state.plans.length - 1];
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
   coverageElement.textContent = plan.cycle.completed
       ? `All ${plan.cycle.totalCount} exercises shown since ${plan.cycle.startIsoDate}.`
       : `${plan.cycle.uniqueCount}/${plan.cycle.totalCount} exercises since ${plan.cycle.startIsoDate}.`;
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
      const plan = buildSchedule(targetDate);
      renderPlan(root, plan, offset);
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
