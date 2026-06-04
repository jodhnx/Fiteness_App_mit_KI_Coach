import type { ExerciseSeed } from "./exercise-library";

function ex(
  slug: string,
  name: string,
  muscleGroup: ExerciseSeed["muscleGroup"],
  equipment: ExerciseSeed["equipment"],
  difficulty: ExerciseSeed["difficulty"],
  primary: string[],
  secondary: string[] = [],
  compound = false
): ExerciseSeed {
  return {
    slug,
    name,
    muscleGroup,
    difficulty,
    equipment,
    primaryMuscles: primary,
    secondaryMuscles: secondary,
    isCompound: compound,
    description: `${name} – gezielte Übung für ${primary.join(", ")} mit kontrollierter Technik.`,
    instructions: [
      "Stabile Ausgangsposition, Core aktivieren.",
      "Bewegung über volles Bewegungsausmaß, kein Schwung.",
      "Spitzenkontraktion kurz halten, exzentrisch 2–3 Sekunden.",
      "Atmung: Ausatmen in der konzentrischen Phase.",
    ],
    imageUrl: `/exercises/${slug}.jpg`,
  };
}

export const EXTENDED_EXERCISES: ExerciseSeed[] = [
  // Brust 10+
  ex("wide-grip-bench-press", "Bankdrücken (weiter Griff)", "CHEST", "BARBELL", "INTERMEDIATE", ["Brust"], ["Trizeps", "Schulter"], true),
  ex("guillotine-press", "Guillotine Press", "CHEST", "BARBELL", "ADVANCED", ["Brust"], ["Schulter"], true),
  ex("machine-incline-press", "Schrägbank Maschine", "CHEST", "MACHINE", "BEGINNER", ["Brust"], ["Schulter"]),
  ex("cable-fly-low-to-high", "Kabel Fly (unten)", "CHEST", "CABLE", "INTERMEDIATE", ["Brust"]),
  ex("pec-deck-fly", "Butterfly Maschine", "CHEST", "MACHINE", "BEGINNER", ["Brust"]),
  ex("weighted-dip-chest", "Weighted Dips (Brust)", "CHEST", "BODYWEIGHT", "ADVANCED", ["Brust", "Trizeps"], [], true),
  ex("landmine-chest-press", "Landmine Brustdrücken", "CHEST", "BARBELL", "INTERMEDIATE", ["Brust"], ["Core"], true),
  ex("single-arm-cable-press", "Einarmiges Kabeldrücken", "CHEST", "CABLE", "INTERMEDIATE", ["Brust"], ["Core"]),
  ex("resistance-band-push-up", "Band Push-Up", "CHEST", "BAND", "BEGINNER", ["Brust"], ["Trizeps"]),
  ex("hex-press-dumbbell", "Hex Press", "CHEST", "DUMBBELL", "INTERMEDIATE", ["Brust", "Trizeps"]),

  // Rücken 14+
  ex("chest-supported-row", "Brustgestütztes Rudern", "BACK", "MACHINE", "BEGINNER", ["Latissimus", "Rhomboiden"], [], true),
  ex("yates-row", "Yates Row", "BACK", "BARBELL", "ADVANCED", ["Latissimus"], ["Bizeps"], true),
  ex("chest-supported-t-bar-row", "T-Bar gestützt", "BACK", "BARBELL", "INTERMEDIATE", ["Latissimus"], [], true),
  ex("wide-grip-seated-row", "Weites Rudern am Kabel", "BACK", "CABLE", "BEGINNER", ["Latissimus"]),
  ex("neutral-grip-pulldown", "Neutralgriff Latzug", "BACK", "CABLE", "BEGINNER", ["Latissimus"]),
  ex("single-arm-cable-pulldown", "Einarmiger Latzug", "BACK", "CABLE", "INTERMEDIATE", ["Latissimus"]),
  ex("rack-pull-block", "Rack Pull (hoch)", "BACK", "BARBELL", "ADVANCED", ["Latissimus", "Trapez"], [], true),
  ex("good-morning-row", "Seal Row", "BACK", "BARBELL", "INTERMEDIATE", ["Rhomboiden", "Latissimus"]),
  ex("band-pull-apart", "Band Pull-Apart", "BACK", "BAND", "BEGINNER", ["Rhomboiden", "Hintere Schulter"]),
  ex("kroc-row", "Kroc Row", "BACK", "DUMBBELL", "ADVANCED", ["Latissimus"], ["Bizeps"], true),
  ex("meadows-row-alt", "Meadows Row Variante", "BACK", "BARBELL", "INTERMEDIATE", ["Latissimus"]),
  ex("reverse-grip-pulldown", "Untergriff Latzug", "BACK", "CABLE", "BEGINNER", ["Latissimus", "Bizeps"]),
  ex("hyper-y-raise", "Y-Raise am Kabel", "BACK", "CABLE", "BEGINNER", ["Trapez", "Hintere Schulter"]),
  ex("jefferson-deadlift", "Jefferson Deadlift", "BACK", "BARBELL", "ADVANCED", ["Latissimus", "Beine"], [], true),

  // Schultern 12+
  ex("cable-y-raise", "Kabel Y-Raise", "SHOULDERS", "CABLE", "BEGINNER", ["Hintere Schulter"]),
  ex("leaning-lateral-raise", "Leaning Lateral Raise", "SHOULDERS", "DUMBBELL", "INTERMEDIATE", ["Seitliche Schulter"]),
  ex("machine-lateral-raise", "Seitheben Maschine", "SHOULDERS", "MACHINE", "BEGINNER", ["Seitliche Schulter"]),
  ex("behind-neck-machine-press", "Nackenpresse Maschine", "SHOULDERS", "MACHINE", "INTERMEDIATE", ["Schulter"]),
  ex("landmine-lateral-raise", "Landmine Lateral Raise", "SHOULDERS", "BARBELL", "INTERMEDIATE", ["Seitliche Schulter"]),
  ex("cable-face-pull-external", "Face Pull (extern rotiert)", "SHOULDERS", "CABLE", "BEGINNER", ["Hintere Schulter", "Rotatorenmanschette"]),
  ex("plate-front-raise", "Scheiben Frontheben", "SHOULDERS", "OTHER", "BEGINNER", ["Vordere Schulter"]),
  ex("snatch-grip-high-pull", "Snatch Grip High Pull", "SHOULDERS", "BARBELL", "ADVANCED", ["Schulter", "Trapez"], [], true),
  ex("kettlebell-press", "Kettlebell Schulterdrücken", "SHOULDERS", "KETTLEBELL", "INTERMEDIATE", ["Schulter"], ["Core"]),
  ex("bradford-press", "Bradford Press", "SHOULDERS", "BARBELL", "ADVANCED", ["Schulter"]),
  ex("cable-upright-row", "Kabel Aufwärtsziehen", "SHOULDERS", "CABLE", "INTERMEDIATE", ["Schulter", "Trapez"]),
  ex("prone-incline-lateral", "Schrägbank Seitheben liegend", "SHOULDERS", "DUMBBELL", "INTERMEDIATE", ["Seitliche Schulter"]),

  // Bizeps 8+
  ex("bayesian-curl", "Bayesian Curl", "BICEPS", "CABLE", "INTERMEDIATE", ["Bizeps"]),
  ex("cross-body-hammer-curl", "Cross Body Hammer Curl", "BICEPS", "DUMBBELL", "BEGINNER", ["Bizeps", "Brachialis"]),
  ex("machine-preacher-curl", "Preacher Curl Maschine", "BICEPS", "MACHINE", "BEGINNER", ["Bizeps"]),
  ex("cable-concentration-curl", "Kabel Konzentrationscurl", "BICEPS", "CABLE", "BEGINNER", ["Bizeps"]),
  ex("ez-bar-preacher-curl", "SZ-Stange Preacher Curl", "BICEPS", "BARBELL", "INTERMEDIATE", ["Bizeps"]),
  ex("21s-curl", "21er Curls", "BICEPS", "BARBELL", "ADVANCED", ["Bizeps"]),
  ex("reverse-grip-ez-curl", "Untergriff SZ-Curl", "BICEPS", "BARBELL", "INTERMEDIATE", ["Bizeps", "Unterarm"]),
  ex("cable-bayesian-incline", "Incline Bayesian Curl", "BICEPS", "CABLE", "INTERMEDIATE", ["Bizeps"]),

  // Trizeps 8+
  ex("single-arm-tricep-pushdown", "Einarmiges Trizepsdrücken", "TRICEPS", "CABLE", "BEGINNER", ["Trizeps"]),
  ex("machine-dip", "Trizeps-Dip Maschine", "TRICEPS", "MACHINE", "BEGINNER", ["Trizeps"]),
  ex("ez-bar-skull-crusher", "SZ Skull Crusher", "TRICEPS", "BARBELL", "INTERMEDIATE", ["Trizeps"]),
  ex("cable-kickback-tricep", "Kabel Kickback Trizeps", "TRICEPS", "CABLE", "BEGINNER", ["Trizeps"]),
  ex("rolling-tricep-extension", "Rolling Tricep Extension", "TRICEPS", "DUMBBELL", "INTERMEDIATE", ["Trizeps"]),
  ex("v-bar-pushdown", "V-Stange Pushdown", "TRICEPS", "CABLE", "BEGINNER", ["Trizeps"]),
  ex("board-press", "Board Press", "TRICEPS", "BARBELL", "ADVANCED", ["Trizeps", "Brust"], [], true),
  ex("bodyweight-tricep-extension", "Bodyweight Trizeps Extension", "TRICEPS", "BODYWEIGHT", "INTERMEDIATE", ["Trizeps"]),

  // Beine 18+
  ex("pendulum-squat", "Pendulum Squat", "LEGS", "MACHINE", "INTERMEDIATE", ["Quadrizeps"], [], true),
  ex("belt-squat", "Belt Squat", "LEGS", "MACHINE", "INTERMEDIATE", ["Quadrizeps", "Gesäß"], [], true),
  ex("spanish-squat", "Spanish Squat", "LEGS", "BAND", "BEGINNER", ["Quadrizeps"]),
  ex("reverse-lunge", "Ausfallschritt zurück", "LEGS", "DUMBBELL", "BEGINNER", ["Quadrizeps", "Gesäß"], [], true),
  ex("curtsy-lunge", "Curtsy Lunge", "LEGS", "DUMBBELL", "INTERMEDIATE", ["Gesäß", "Quadrizeps"]),
  ex("trap-bar-deadlift", "Trap Bar Deadlift", "LEGS", "BARBELL", "INTERMEDIATE", ["Gesäß", "Hamstrings"], [], true),
  ex("single-leg-rdl", "Einbeiniges RDL", "LEGS", "DUMBBELL", "INTERMEDIATE", ["Hamstrings", "Gesäß"], ["Core"]),
  ex("cable-pull-through", "Kabel Pull-Through", "LEGS", "CABLE", "BEGINNER", ["Gesäß", "Hamstrings"]),
  ex("hack-squat-narrow", "Enger Hack Squat", "LEGS", "MACHINE", "INTERMEDIATE", ["Quadrizeps"]),
  ex("smith-machine-lunge", "Smith Ausfallschritt", "LEGS", "SMITH_MACHINE", "BEGINNER", ["Quadrizeps", "Gesäß"]),
  ex("leg-press-single-leg", "Einbeinige Beinpresse", "LEGS", "MACHINE", "INTERMEDIATE", ["Quadrizeps", "Gesäß"]),
  ex("seated-good-morning", "Good Morning sitzend", "LEGS", "BARBELL", "ADVANCED", ["Hamstrings", "Gesäß"]),
  ex("frog-pump", "Frog Pump", "LEGS", "BODYWEIGHT", "BEGINNER", ["Gesäß"]),
  ex("copenhagen-plank", "Copenhagen Plank", "LEGS", "BODYWEIGHT", "INTERMEDIATE", ["Adduktoren", "Core"]),
  ex("terminal-knee-extension", "Terminal Knee Extension", "LEGS", "BAND", "BEGINNER", ["Quadrizeps"]),
  ex("nordic-curl-assisted", "Nordic Curl (assistiert)", "LEGS", "BODYWEIGHT", "INTERMEDIATE", ["Hamstrings"]),
  ex("jefferson-squat", "Jefferson Squat", "LEGS", "BARBELL", "ADVANCED", ["Quadrizeps", "Gesäß"], [], true),
  ex("landmine-squat", "Landmine Squat", "LEGS", "BARBELL", "BEGINNER", ["Quadrizeps", "Gesäß"], [], true),

  // Bauch 10+
  ex("hanging-knee-raise", "Hängendes Knieheben", "ABS", "BODYWEIGHT", "INTERMEDIATE", ["Bauch"]),
  ex("cable-pallof-hold", "Pallof Hold", "ABS", "CABLE", "BEGINNER", ["Core", "Schräge Bauchmuskeln"]),
  ex("decline-crunch-weighted", "Negativ Crunch (gewichtet)", "ABS", "MACHINE", "INTERMEDIATE", ["Bauch"]),
  ex("stability-ball-crunch", "Gymnastikball Crunch", "ABS", "OTHER", "BEGINNER", ["Bauch"]),
  ex("hollow-rock", "Hollow Rock", "ABS", "BODYWEIGHT", "INTERMEDIATE", ["Bauch"]),
  ex("cable-woodchopper-low", "Kabel Woodchopper (tief)", "ABS", "CABLE", "BEGINNER", ["Schräge Bauchmuskeln"]),
  ex("reverse-crunch", "Reverse Crunch", "ABS", "BODYWEIGHT", "BEGINNER", ["Unterbauch"]),
  ex("suitcase-crunch", "Suitcase Crunch", "ABS", "DUMBBELL", "INTERMEDIATE", ["Schräge Bauchmuskeln"]),
  ex("dragon-walk", "Dragon Walk", "ABS", "BODYWEIGHT", "ADVANCED", ["Core"], [], true),
  ex("ab-wheel-kneeling", "Ab Wheel (kniend)", "ABS", "OTHER", "BEGINNER", ["Bauch", "Core"]),

  // Waden 4+
  ex("calf-press-on-leg-press", "Wadenpresse an Beinpresse", "CALVES", "MACHINE", "BEGINNER", ["Waden"]),
  ex("single-leg-seated-calf", "Einbeinige Waden sitzend", "CALVES", "MACHINE", "INTERMEDIATE", ["Waden"]),
  ex("jump-rope-calf", "Seilspringen Waden", "CALVES", "NONE", "BEGINNER", ["Waden", "Cardio"]),
  ex("tibialis-raise", "Tibialis Raise", "CALVES", "BODYWEIGHT", "BEGINNER", ["Schienbein"]),

  // Unterarme 6+
  ex("reverse-curl-barbell", "Reverse Curl Langhantel", "FOREARMS", "BARBELL", "BEGINNER", ["Unterarm", "Bizeps"]),
  ex("behind-back-wrist-curl", "Wrist Curl hinter dem Rücken", "FOREARMS", "BARBELL", "INTERMEDIATE", ["Unterarm"]),
  ex("fat-grip-dead-hang", "Fat Grip Dead Hang", "FOREARMS", "BODYWEIGHT", "INTERMEDIATE", ["Unterarm", "Griffkraft"]),
  ex("barbell-hold", "Barbell Hold", "FOREARMS", "BARBELL", "ADVANCED", ["Griffkraft", "Unterarm"]),
  ex("wrist-roller-overhand", "Wrist Roller (pronation)", "FOREARMS", "OTHER", "INTERMEDIATE", ["Unterarm"]),
  ex("plate-curl", "Plate Curl", "FOREARMS", "OTHER", "BEGINNER", ["Unterarm", "Bizeps"]),

  // Cardio 10+
  ex("incline-walk-treadmill", "Steigung Laufband", "CARDIO", "MACHINE", "BEGINNER", ["Beine", "Cardio"], [], true),
  ex("stairmaster", "Stairmaster", "CARDIO", "MACHINE", "INTERMEDIATE", ["Beine", "Cardio"], [], true),
  ex("spin-bike", "Spinning Bike", "CARDIO", "MACHINE", "BEGINNER", ["Beine", "Cardio"]),
  ex("box-jumps", "Box Jumps", "CARDIO", "BODYWEIGHT", "INTERMEDIATE", ["Beine", "Cardio"], [], true),
  ex("shuttle-run", "Shuttle Run", "CARDIO", "NONE", "ADVANCED", ["Beine", "Cardio"], [], true),
  ex("swimming-freestyle", "Schwimmen Kraul", "CARDIO", "NONE", "INTERMEDIATE", ["Ganzkörper", "Cardio"], [], true),
  ex("rowing-sprints", "Ruder-Sprints", "CARDIO", "MACHINE", "ADVANCED", ["Rücken", "Cardio"], [], true),
  ex("battle-rope-waves", "Battle Rope Waves", "CARDIO", "OTHER", "BEGINNER", ["Schulter", "Core", "Cardio"]),
  ex("sled-push", "Schlitten schieben", "CARDIO", "OTHER", "INTERMEDIATE", ["Beine", "Cardio"], [], true),
  ex("agility-ladder", "Koordinationsleiter", "CARDIO", "NONE", "BEGINNER", ["Beine", "Cardio"]),
];
