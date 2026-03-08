export type SectionKey = "flow" | "main" | "accessory" | "conditioning" | "micro";
export type MovementZone = "upper" | "lower" | "neutral";
export type IntensityTier = "low" | "medium" | "high";

export interface ExerciseRules {
   min_rest_days_between_sessions: number;
   max_rest_days_between_sessions: number;
   max_sessions_per_day: number;
   target_sessions_per_week: number;
}

export interface RawExercise {
   name: string;
   category: string;
   rules: ExerciseRules;
}

export interface ExerciseFile {
   categories: string[];
   exercises: RawExercise[];
}

export interface SlotAffinity {
   flow?: number;
   main?: number;
   accessory?: number;
   conditioning?: number;
   micro?: number;
}

export interface RelationshipProfile {
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

export interface RelationshipFile {
   go_live_date: string;
   coverage_window_days: number;
   session_load_cap: number;
   category_profiles: Record<string, RelationshipProfile>;
   exercise_overrides: Record<string, RelationshipProfile>;
}

export interface Exercise extends RawExercise {
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

export interface SelectedExercise {
   exercise: Exercise;
}

export interface DailyPlan {
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

export interface ScheduleState {
   lastSeen: Map<string, number>;
   appearances: Map<string, number[]>;
   cycle: {
      cycleNumber: number;
      startDayIndex: number;
      seenExercises: Set<string>;
   };
}

export interface SerializedScheduleState {
   last_seen: Record<string, number>;
   appearances: Record<string, number[]>;
   cycle: {
      cycle_number: number;
      start_day_index: number;
      seen_exercises: string[];
   };
}

export interface CheckpointFile {
   generated_at: string;
   go_live_date: string;
   checkpoint_interval_days: number;
   horizon_days: number;
   checkpoints: Array<{
      day_index: number;
      iso_date: string;
      state: SerializedScheduleState;
   }>;
}

export interface SchedulerCheckpoint {
   dayIndex: number;
   state: ScheduleState;
}

export interface SchedulerCache {
   anchorDate: Date;
   exercises: Exercise[];
   plans: Map<number, DailyPlan>;
   checkpoints: SchedulerCheckpoint[];
   state: ScheduleState;
   computedThroughDayIndex: number;
}

interface SchedulerContext {
   exerciseFile: ExerciseFile;
   relationshipFile: RelationshipFile;
}

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

export const SECTION_ORDER: SectionKey[] = ["flow", "main", "accessory", "conditioning", "micro"];
export const CHECKPOINT_INTERVAL_DAYS = 90;
const CHECKPOINT_APPEARANCE_WINDOW_DAYS = 21;

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

   if (exercise.category !== "Flow") {
      affinity.flow = 0;
   }

   if (exercise.category !== "Conditioning") {
      affinity.conditioning = 0;
   }

   return affinity;
}

function validateConfiguration(context: SchedulerContext): void {
   const declaredCategories = context.exerciseFile.categories;
   const declaredCategorySet = new Set(declaredCategories);
   const duplicateCategories = declaredCategories.filter((category, index) => declaredCategories.indexOf(category) !== index);

   if (duplicateCategories.length > 0) {
      throw new Error(`Duplicate categories in exercise-rules.json: ${[...new Set(duplicateCategories)].join(", ")}`);
   }

   const exerciseCategories = new Set(context.exerciseFile.exercises.map((exercise) => exercise.category));
   const missingCategories = [...exerciseCategories].filter((category) => !declaredCategorySet.has(category));
   if (missingCategories.length > 0) {
      throw new Error(`Exercises reference undeclared categories: ${missingCategories.join(", ")}`);
   }

   const missingProfiles = declaredCategories.filter((category) => !(category in context.relationshipFile.category_profiles));
   if (missingProfiles.length > 0) {
      throw new Error(`Missing category_profiles for categories: ${missingProfiles.join(", ")}`);
   }

   const extraProfiles = Object.keys(context.relationshipFile.category_profiles).filter((category) => !declaredCategorySet.has(category));
   if (extraProfiles.length > 0) {
      throw new Error(`category_profiles contains unknown categories: ${extraProfiles.join(", ")}`);
   }

   const exerciseNames = context.exerciseFile.exercises.map((exercise) => exercise.name);
   const duplicateExercises = exerciseNames.filter((name, index) => exerciseNames.indexOf(name) !== index);
   if (duplicateExercises.length > 0) {
      throw new Error(`Duplicate exercise names in exercise-rules.json: ${[...new Set(duplicateExercises)].join(", ")}`);
   }
}

function getCompatibleCheckpoints(
    checkpointFile: CheckpointFile,
    relationshipFile: RelationshipFile
): SchedulerCheckpoint[] {
   if (
      checkpointFile.go_live_date !== relationshipFile.go_live_date ||
      checkpointFile.checkpoint_interval_days !== CHECKPOINT_INTERVAL_DAYS
   ) {
      return [];
   }

   return checkpointFile.checkpoints.map((checkpoint) => ({
      dayIndex: checkpoint.day_index,
      state: deserializeScheduleState(checkpoint.state)
   }));
}

function buildCatalog(context: SchedulerContext): Exercise[] {
   return context.exerciseFile.exercises.map((exercise) => {
      const profile = context.relationshipFile.category_profiles[exercise.category] ?? {};
      const override = context.relationshipFile.exercise_overrides[exercise.name] ?? {};

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

export function addDays(date: Date, days: number): Date {
   const next = new Date(date);
   next.setDate(next.getDate() + days);
   return next;
}

export function startOfDay(date: Date): Date {
   return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toIsoDate(date: Date): string {
   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, "0");
   const day = String(date.getDate()).padStart(2, "0");
   return `${year}-${month}-${day}`;
}

export function parseIsoDate(isoDate: string): Date {
   const [year, month, day] = isoDate.split("-").map(Number);
   return new Date(year, month - 1, day);
}

export function resolveTrainingDay(now: Date): Date {
   const scheduledDay = startOfDay(now);
   if (now.getHours() < 6) {
      scheduledDay.setDate(scheduledDay.getDate() - 1);
   }
   return scheduledDay;
}

export function getDayIndex(anchorDate: Date, targetDate: Date): number {
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

export function createScheduleState(): ScheduleState {
   return {
      lastSeen: new Map<string, number>(),
      appearances: new Map<string, number[]>(),
      cycle: {
         cycleNumber: 1,
         startDayIndex: 0,
         seenExercises: new Set<string>()
      }
   };
}

export function cloneScheduleState(state: ScheduleState): ScheduleState {
   return {
      lastSeen: new Map(state.lastSeen),
      appearances: new Map(
          [...state.appearances.entries()].map(([exerciseName, appearances]) => [exerciseName, [...appearances]])
      ),
      cycle: {
         cycleNumber: state.cycle.cycleNumber,
         startDayIndex: state.cycle.startDayIndex,
         seenExercises: new Set(state.cycle.seenExercises)
      }
   };
}

export function serializeScheduleState(state: ScheduleState, minimumAppearanceDay = Number.NEGATIVE_INFINITY): SerializedScheduleState {
   return {
      last_seen: Object.fromEntries(state.lastSeen.entries()),
      appearances: Object.fromEntries(
          [...state.appearances.entries()].map(([exerciseName, appearances]) => [
             exerciseName,
             appearances.filter((appearance) => appearance >= minimumAppearanceDay)
          ])
      ),
      cycle: {
         cycle_number: state.cycle.cycleNumber,
         start_day_index: state.cycle.startDayIndex,
         seen_exercises: [...state.cycle.seenExercises]
      }
   };
}

export function deserializeScheduleState(serialized: SerializedScheduleState): ScheduleState {
   return {
      lastSeen: new Map(Object.entries(serialized.last_seen)),
      appearances: new Map(
          Object.entries(serialized.appearances).map(([exerciseName, appearances]) => [exerciseName, [...appearances]])
      ),
      cycle: {
         cycleNumber: serialized.cycle.cycle_number,
         startDayIndex: serialized.cycle.start_day_index,
         seenExercises: new Set(serialized.cycle.seen_exercises)
      }
   };
}

function isEligible(exercise: Exercise, state: ScheduleState, dayIndex: number): boolean {
   const lastSeen = getLastSeen(state, exercise.name);
   if (lastSeen === null) {
      return true;
   }
   return dayIndex - lastSeen > exercise.rules.min_rest_days_between_sessions;
}

function computeUrgency(exercise: Exercise, state: ScheduleState, dayIndex: number, context: SchedulerContext): number {
   const appearances = getAppearances(state, exercise.name);
   const lastSeen = getLastSeen(state, exercise.name);
   const gap = getGapSinceLast(lastSeen, dayIndex);
   const recentWeekCount = getRecentCount(appearances, dayIndex - 1, 7);
   const idealInterval = Math.max(1, 7 / exercise.rules.target_sessions_per_week);
   const targetGap = Math.max(0, exercise.rules.target_sessions_per_week - recentWeekCount);
   const coverageWindowDays = context.relationshipFile.coverage_window_days;
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

function computeSlotScore(
    exercise: Exercise,
    slot: SectionKey,
    state: ScheduleState,
    selected: SelectedExercise[],
    dayIndex: number,
    context: SchedulerContext
): number {
   if (!isEligible(exercise, state, dayIndex)) {
      return Number.NEGATIVE_INFINITY;
   }

   const slotWeight = exercise.metadata.slotAffinity[slot];
   if (slotWeight <= 0) {
      return Number.NEGATIVE_INFINITY;
   }

   const urgency = computeUrgency(exercise, state, dayIndex, context);
   const compatibility = computeCompatibility(exercise, slot, selected);
   const tieBreaker = hashNumber(`${context.relationshipFile.go_live_date}:${dayIndex}:${slot}:${exercise.name}`);

   return urgency * slotWeight + compatibility + tieBreaker;
}

function addAppearance(state: ScheduleState, exerciseName: string, dayIndex: number): void {
   const appearances = getAppearances(state, exerciseName);
   appearances.push(dayIndex);
   state.appearances.set(exerciseName, appearances);
   state.lastSeen.set(exerciseName, dayIndex);
}

function getCoverage(state: ScheduleState, exercises: Exercise[], dayIndex: number, context: SchedulerContext): DailyPlan["coverage"] {
   const minDay = Math.max(0, dayIndex - context.relationshipFile.coverage_window_days + 1);
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
    exercise: Exercise
): SelectedExercise {
   const selection: SelectedExercise = {exercise};
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
    predicate: (exercise: Exercise) => boolean,
    context: SchedulerContext
): Exercise | null {
   const selected = SECTION_ORDER.flatMap((slot) => sections[slot]);
   const selectedNames = getSelectedNames(sections);
   let bestExercise: Exercise | null = null;
   let bestScore = Number.NEGATIVE_INFINITY;

   for (const exercise of exercises) {
      if (selectedNames.has(exercise.name) || !predicate(exercise)) {
         continue;
      }

      const score = computeSlotScore(exercise, section, state, selected, dayIndex, context);
      if (!Number.isFinite(score) || score <= bestScore) {
         continue;
      }

      bestExercise = exercise;
      bestScore = score;
   }

   return bestExercise;
}

function shouldAllowHeavyDay(sections: Record<SectionKey, SelectedExercise[]>): boolean {
   return !sections.main.some((item) => item.exercise.metadata.intensityTier === "high");
}

function buildDayPlan(dayIndex: number, date: Date, exercises: Exercise[], state: ScheduleState, context: SchedulerContext): DailyPlan {
   const sections: Record<SectionKey, SelectedExercise[]> = {
      flow: [],
      main: [],
      accessory: [],
      conditioning: [],
      micro: []
   };
   const loadCap = context.relationshipFile.session_load_cap;
   const isoDate = toIsoDate(date);
   const dateLabel = new Intl.DateTimeFormat("en-US", {month: "long", day: "numeric", year: "numeric"}).format(date);
   const dayLabel = new Intl.DateTimeFormat("en-US", {weekday: "long"}).format(date);

   const walking = exercises.find((exercise) => exercise.name === "Walking");
   if (walking) {
      selectExercise(sections, "micro", walking);
   }

   const upperMain = pickBestExercise(
       exercises,
       "main",
       state,
       sections,
       dayIndex,
       (exercise) => exercise.metadata.movementZone === "upper" && exercise.metadata.slotAffinity.main >= 3,
       context
   );
   if (upperMain) {
      selectExercise(sections, "main", upperMain);
   }

   const lowerMain = pickBestExercise(
       exercises,
       "main",
       state,
       sections,
       dayIndex,
       (exercise) => exercise.metadata.movementZone === "lower" && exercise.metadata.slotAffinity.main >= 3,
       context
   );
   if (lowerMain && (getCurrentLoad(sections) + lowerMain.metadata.loadScore <= loadCap || sections.main.length === 0)) {
      selectExercise(sections, "main", lowerMain);
   }

   if (sections.main.length === 0) {
      const fallbackMain = pickBestExercise(
          exercises,
          "main",
          state,
          sections,
          dayIndex,
          (exercise) => exercise.metadata.slotAffinity.main >= 3,
          context
      );
      if (fallbackMain) {
         selectExercise(sections, "main", fallbackMain);
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
          (exercise) => exercise.metadata.slotAffinity.main >= 3,
          context
      );
      if (!nextMain) {
         break;
      }

      const nextScore = computeSlotScore(nextMain, "main", state, SECTION_ORDER.flatMap((section) => sections[section]), dayIndex, context);
      if (nextScore < 12) {
         break;
      }

      if (getCurrentLoad(sections) + nextMain.metadata.loadScore > loadCap) {
         break;
      }

      selectExercise(sections, "main", nextMain);
   }

   while (sections.flow.length < 1) {
      const flowExercise = pickBestExercise(
          exercises,
          "flow",
          state,
          sections,
          dayIndex,
          (exercise) => exercise.metadata.slotAffinity.flow >= 1,
          context
      );
      if (!flowExercise) {
         break;
      }
      selectExercise(sections, "flow", flowExercise);
   }

   const desiredAccessoryCount = hashNumber(`${isoDate}:accessory-volume`) > 0.63 ? 3 : 2;
   while (sections.accessory.length < desiredAccessoryCount) {
      const accessory = pickBestExercise(
          exercises,
          "accessory",
          state,
          sections,
          dayIndex,
          (exercise) => exercise.metadata.slotAffinity.accessory >= 2,
          context
      );
      if (!accessory) {
         break;
      }

      const score = computeSlotScore(accessory, "accessory", state, SECTION_ORDER.flatMap((section) => sections[section]), dayIndex, context);
      const mustFillFirstAccessory = sections.accessory.length === 0;
      if (!mustFillFirstAccessory && score < 9) {
         break;
      }

      if (getCurrentLoad(sections) + accessory.metadata.loadScore > loadCap + 1) {
         break;
      }

      selectExercise(sections, "accessory", accessory);
   }

   const conditioning = pickBestExercise(
       exercises,
       "conditioning",
       state,
       sections,
       dayIndex,
       (exercise) => exercise.name !== "Walking" && exercise.metadata.slotAffinity.conditioning >= 2,
       context
   );
   if (conditioning) {
      const conditioningScore = computeSlotScore(conditioning, "conditioning", state, SECTION_ORDER.flatMap((section) => sections[section]), dayIndex, context);
      if (conditioningScore >= 10 && getCurrentLoad(sections) + conditioning.metadata.loadScore <= loadCap + 1) {
         selectExercise(sections, "conditioning", conditioning);
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
          (exercise) => exercise.name !== "Walking" && exercise.metadata.slotAffinity.micro >= 1,
          context
      );
      if (!micro) {
         break;
      }

      const microScore = computeSlotScore(micro, "micro", state, SECTION_ORDER.flatMap((section) => sections[section]), dayIndex, context);
      if (microScore < 8.5) {
         break;
      }

      selectExercise(sections, "micro", micro);
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
      coverage: getCoverage(state, exercises, dayIndex, context)
   };
}

export function findLatestCheckpointBefore(checkpoints: SchedulerCheckpoint[], dayIndex: number): SchedulerCheckpoint | null {
   let latest: SchedulerCheckpoint | null = null;
   for (const checkpoint of checkpoints) {
      if (checkpoint.dayIndex >= dayIndex) {
         break;
      }
      latest = checkpoint;
   }
   return latest;
}

function hasCheckpointForDay(checkpoints: SchedulerCheckpoint[], dayIndex: number): boolean {
   return checkpoints.some((checkpoint) => checkpoint.dayIndex === dayIndex);
}

export function advanceScheduleRange(
    startDayIndex: number,
    finalDayIndex: number,
    cache: SchedulerCache,
    context: SchedulerContext,
    checkpoints?: SchedulerCheckpoint[]
): DailyPlan | null {
   let lastPlan: DailyPlan | null = null;

   for (let dayIndex = startDayIndex; dayIndex <= finalDayIndex; dayIndex += 1) {
      const date = addDays(cache.anchorDate, dayIndex);
      const plan = buildDayPlan(dayIndex, date, cache.exercises, cache.state, context);

      for (const section of SECTION_ORDER) {
         for (const item of plan.sections[section]) {
            cache.state.cycle.seenExercises.add(item.exercise.name);
         }
      }

      plan.cycle = {
         cycleNumber: cache.state.cycle.cycleNumber,
         startIsoDate: toIsoDate(addDays(cache.anchorDate, cache.state.cycle.startDayIndex)),
         dayNumber: dayIndex - cache.state.cycle.startDayIndex + 1,
         uniqueCount: cache.state.cycle.seenExercises.size,
         totalCount: cache.exercises.length,
         missingExercises: cache.exercises
             .map((exercise) => exercise.name)
             .filter((exerciseName) => !cache.state.cycle.seenExercises.has(exerciseName)),
         completed: cache.state.cycle.seenExercises.size === cache.exercises.length
      };

      cache.plans.set(dayIndex, plan);

      if (plan.cycle.completed) {
         cache.state.cycle = {
            cycleNumber: cache.state.cycle.cycleNumber + 1,
            startDayIndex: dayIndex + 1,
            seenExercises: new Set<string>()
         };
      }

      if (checkpoints && (dayIndex + 1) % CHECKPOINT_INTERVAL_DAYS === 0 && !hasCheckpointForDay(checkpoints, dayIndex)) {
         checkpoints.push({
            dayIndex,
            state: cloneScheduleState(cache.state)
         });
      }

      lastPlan = plan;
   }

   return lastPlan;
}

export function createSchedulerCache(
    exerciseFile: ExerciseFile,
    relationshipFile: RelationshipFile,
    checkpointFile: CheckpointFile,
    targetDate: Date
): SchedulerCache {
   validateConfiguration({exerciseFile, relationshipFile});
   const anchorDate = parseIsoDate(relationshipFile.go_live_date);
   const precomputedCheckpoints = getCompatibleCheckpoints(checkpointFile, relationshipFile);
   const targetDayIndex = Math.max(0, getDayIndex(anchorDate, startOfDay(targetDate)));
   const baseCheckpoint = findLatestCheckpointBefore(precomputedCheckpoints, targetDayIndex);

   return {
      anchorDate,
      exercises: buildCatalog({exerciseFile, relationshipFile}),
      plans: new Map<number, DailyPlan>(),
      checkpoints: precomputedCheckpoints,
      state: baseCheckpoint ? cloneScheduleState(baseCheckpoint.state) : createScheduleState(),
      computedThroughDayIndex: baseCheckpoint?.dayIndex ?? -1
   };
}

export function getPlanForDate(
    cache: SchedulerCache,
    exerciseFile: ExerciseFile,
    relationshipFile: RelationshipFile,
    targetDate: Date
): DailyPlan {
   const context = {exerciseFile, relationshipFile};
   const finalDayIndex = Math.max(0, getDayIndex(cache.anchorDate, startOfDay(targetDate)));

   if (cache.plans.has(finalDayIndex)) {
      return cache.plans.get(finalDayIndex)!;
   }

   if (finalDayIndex > cache.computedThroughDayIndex) {
      const plan = advanceScheduleRange(cache.computedThroughDayIndex + 1, finalDayIndex, cache, context, cache.checkpoints);
      cache.computedThroughDayIndex = finalDayIndex;
      return plan!;
   }

   const baseCheckpoint = findLatestCheckpointBefore(cache.checkpoints, finalDayIndex);
   const rewindCache: SchedulerCache = {
      ...cache,
      plans: new Map<number, DailyPlan>(),
      state: baseCheckpoint ? cloneScheduleState(baseCheckpoint.state) : createScheduleState(),
      computedThroughDayIndex: baseCheckpoint?.dayIndex ?? -1
   };
   const rewindStartDayIndex = rewindCache.computedThroughDayIndex + 1;
   const plan = advanceScheduleRange(rewindStartDayIndex, finalDayIndex, rewindCache, context);

   for (const [dayIndex, dailyPlan] of rewindCache.plans.entries()) {
      cache.plans.set(dayIndex, dailyPlan);
   }

   return plan!;
}

export function createCheckpointFile(
    exerciseFile: ExerciseFile,
    relationshipFile: RelationshipFile,
    horizonDays: number,
    generatedAt = new Date().toISOString()
): CheckpointFile {
   validateConfiguration({exerciseFile, relationshipFile});
   const anchorDate = parseIsoDate(relationshipFile.go_live_date);
   const cache: SchedulerCache = {
      anchorDate,
      exercises: buildCatalog({exerciseFile, relationshipFile}),
      plans: new Map<number, DailyPlan>(),
      checkpoints: [],
      state: createScheduleState(),
      computedThroughDayIndex: -1
   };

   advanceScheduleRange(0, horizonDays, cache, {exerciseFile, relationshipFile}, cache.checkpoints);

   return {
      generated_at: generatedAt,
      go_live_date: relationshipFile.go_live_date,
      checkpoint_interval_days: CHECKPOINT_INTERVAL_DAYS,
      horizon_days: horizonDays,
      checkpoints: cache.checkpoints.map((checkpoint) => ({
         day_index: checkpoint.dayIndex,
         iso_date: toIsoDate(addDays(anchorDate, checkpoint.dayIndex)),
         state: serializeScheduleState(
             checkpoint.state,
             checkpoint.dayIndex - CHECKPOINT_APPEARANCE_WINDOW_DAYS + 1
         )
      }))
   };
}
