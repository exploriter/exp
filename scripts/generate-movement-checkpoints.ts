import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
   createCheckpointFile,
   type ExerciseFile,
   type RelationshipFile
} from "../_includes/js/movement-core.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HORIZON_DAYS = 1095;

const exerciseFile = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "practices", "exercise-rules.json"), "utf8")
) as ExerciseFile;
const relationshipFile = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "practices", "exercise-relationships.json"), "utf8")
) as RelationshipFile;

const checkpointFile = createCheckpointFile(exerciseFile, relationshipFile, HORIZON_DAYS);
const outputPath = path.join(__dirname, "..", "practices", "movement-checkpoints.json");

fs.writeFileSync(outputPath, `${JSON.stringify(checkpointFile, null, 2)}\n`);
