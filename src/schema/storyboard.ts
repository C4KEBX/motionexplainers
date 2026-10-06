import { z } from "zod";

export class StoryboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoryboardError";
  }
}

export const TONES = ["positive", "negative", "neutral", "highlight"] as const;

export const CueSchema = z.strictObject({
  atWord: z.string().min(1),
  occurrence: z.number().int().min(1).default(1),
  do: z.enum(["callout", "emphasize"]),
  text: z.string().min(1).optional(),
}).refine((cue) => cue.do !== "callout" || cue.text !== undefined, {
  message: "a callout cue requires text",
  path: ["text"],
});

const sceneBase = {
  id: z.string().regex(/^[a-z0-9-]+$/, "scene id must be lowercase letters, digits, hyphens"),
  narration: z.string().min(1),
  cues: z.array(CueSchema).default([]),
};

const TitleSceneSchema = z.strictObject({
  ...sceneBase,
  type: z.literal("title"),
  props: z.strictObject({
    headline: z.string().min(1).max(80),
    kicker: z.string().min(1).max(40).optional(),
  }),
});

const BigNumberSceneSchema = z.strictObject({
  ...sceneBase,
  type: z.literal("big-number"),
  props: z.strictObject({
    value: z.number(),
    prefix: z.string().max(4).default(""),
    suffix: z.string().max(6).default(""),
    decimals: z.number().int().min(0).max(4).default(0),
    label: z.string().min(1).max(60),
    factId: z.string().min(1),
    tone: z.enum(TONES).default("highlight"),
  }),
});

const SceneSchema = z.discriminatedUnion("type", [TitleSceneSchema, BigNumberSceneSchema]);

export const StoryboardSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    meta: z.strictObject({
      title: z.string().min(1),
      theme: z.literal("bold-flat"),
      voice: z.string().min(1),
    }),
    audio: z.strictObject({ music: z.string().min(1).nullable() }),
    scenes: z.array(SceneSchema).min(1),
  })
  .superRefine((sb, ctx) => {
    const seen = new Set<string>();
    sb.scenes.forEach((scene, index) => {
      if (seen.has(scene.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["scenes", index, "id"],
          message: `duplicate scene id "${scene.id}"`,
        });
      }
      seen.add(scene.id);
    });
  });

export type Storyboard = z.output<typeof StoryboardSchema>;
export type Scene = Storyboard["scenes"][number];
export type TitleProps = Extract<Scene, { type: "title" }>["props"];
export type BigNumberProps = Extract<Scene, { type: "big-number" }>["props"];

export function parseStoryboard(input: unknown): Storyboard {
  const result = StoryboardSchema.safeParse(input);
  if (!result.success) throw new StoryboardError(z.prettifyError(result.error));
  return result.data;
}
