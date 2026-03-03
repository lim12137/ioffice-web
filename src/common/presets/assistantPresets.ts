import type { PresetAgentType } from '@/types/acpTypes';

export type AssistantPreset = {
  id: string;
  avatar: string;
  presetAgentType?: PresetAgentType;
  /**
   * Directory containing all resources for this preset (relative to project root).
   * If set, both ruleFiles and skillFiles will be resolved from this directory.
   * Default: rules/ for rules, skills/ for skills
   */
  resourceDir?: string;
  ruleFiles: Record<string, string>;
  skillFiles?: Record<string, string>;
  /**
   * Default enabled skills for this assistant (skill names from skills/ directory).
   */
  defaultEnabledSkills?: string[];
  nameI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  promptsI18n?: Record<string, string[]>;
};

export const ASSISTANT_PRESETS: AssistantPreset[] = [
  {
    id: 'cowork',
    avatar: 'cowork.svg',
    presetAgentType: 'codex',
    resourceDir: 'assistant/cowork',
    ruleFiles: {
      'en-US': 'cowork.md',
      'zh-CN': 'cowork.md',
    },
    skillFiles: {
      'en-US': 'cowork-skills.md',
      'zh-CN': 'cowork-skills.zh-CN.md',
    },
    defaultEnabledSkills: ['skill-creator', 'pptx', 'docx', 'pdf', 'xlsx'],
    nameI18n: {
      'en-US': 'Cowork',
      'zh-CN': 'Cowork',
    },
    descriptionI18n: {
      'en-US': 'Autonomous task execution with file operations, document processing, and multi-step workflow planning.',
      'zh-CN': '??????????????????????????????',
    },
    promptsI18n: {
      'en-US': ['Analyze the project structure', 'Automate the build process'],
      'zh-CN': ['??????', '???????'],
    },
  },
  {
    id: 'pptx-generator',
    avatar: '??',
    presetAgentType: 'codex',
    resourceDir: 'assistant/pptx-generator',
    ruleFiles: {
      'en-US': 'pptx-generator.md',
      'zh-CN': 'pptx-generator.zh-CN.md',
    },
    nameI18n: {
      'en-US': 'PPTX Generator',
      'zh-CN': 'PPTX ???',
    },
    descriptionI18n: {
      'en-US': 'Generate local PPTX assets and structure for pptxgenjs.',
      'zh-CN': '???? PPTX ??????pptxgenjs??',
    },
    promptsI18n: {
      'en-US': ['Create a slide deck about AI trends', 'Generate a PPT for quarterly report'],
      'zh-CN': ['??????AI??????', '??????PPT'],
    },
  },
  {
    id: 'pdf-to-ppt',
    avatar: '??',
    presetAgentType: 'codex',
    resourceDir: 'assistant/pdf-to-ppt',
    ruleFiles: {
      'en-US': 'pdf-to-ppt.md',
      'zh-CN': 'pdf-to-ppt.zh-CN.md',
    },
    nameI18n: {
      'en-US': 'PDF to PPT',
      'zh-CN': 'PDF ? PPT',
    },
    descriptionI18n: {
      'en-US': 'Convert PDF to PPT with watermark removal rules.',
      'zh-CN': 'PDF ? PPT ????????',
    },
    promptsI18n: {
      'en-US': ['Convert report.pdf to slides', 'Extract charts from whitepaper.pdf'],
      'zh-CN': ['? report.pdf ??????', '????????'],
    },
  },
  {
    id: 'ui-ux-pro-max',
    avatar: '??',
    presetAgentType: 'codex',
    resourceDir: 'assistant/ui-ux-pro-max',
    ruleFiles: {
      'en-US': 'ui-ux-pro-max.md',
      'zh-CN': 'ui-ux-pro-max.zh-CN.md',
    },
    nameI18n: {
      'en-US': 'UI/UX Pro Max',
      'zh-CN': 'UI/UX ?????',
    },
    descriptionI18n: {
      'en-US': 'Professional UI/UX design intelligence with 57 styles, 95 color palettes, 56 font pairings, and stack-specific best practices.',
      'zh-CN': '?? UI/UX ????????? 57 ????95 ??????56 ??????????????',
    },
    promptsI18n: {
      'en-US': ['Design a login page for a fintech app', 'Create a color palette for a nature theme'],
      'zh-CN': ['????????????', '?????????????'],
    },
  },
  {
    id: 'planning-with-files',
    avatar: '??',
    presetAgentType: 'codex',
    resourceDir: 'assistant/planning-with-files',
    ruleFiles: {
      'en-US': 'planning-with-files.md',
      'zh-CN': 'planning-with-files.zh-CN.md',
    },
    nameI18n: {
      'en-US': 'Planning with Files',
      'zh-CN': '??????',
    },
    descriptionI18n: {
      'en-US': 'Manus-style file-based planning for complex tasks. Uses task_plan.md, findings.md, and progress.md to maintain persistent context.',
      'zh-CN': 'Manus ????????????????? task_plan.md?findings.md ? progress.md ?????????',
    },
    promptsI18n: {
      'en-US': ['Plan a refactoring task', 'Break down the feature implementation'],
      'zh-CN': ['????????', '????????'],
    },
  },
  {
    id: 'human-3-coach',
    avatar: '??',
    presetAgentType: 'codex',
    resourceDir: 'assistant/human-3-coach',
    ruleFiles: {
      'en-US': 'human-3-coach.md',
      'zh-CN': 'human-3-coach.zh-CN.md',
    },
    nameI18n: {
      'en-US': 'HUMAN 3.0 Coach',
      'zh-CN': 'HUMAN 3.0 ??',
    },
    descriptionI18n: {
      'en-US': 'Personal development coach based on HUMAN 3.0 framework: 4 Quadrants (Mind/Body/Spirit/Vocation), 3 Levels, 3 Growth Phases.',
      'zh-CN': '?? HUMAN 3.0 ??????????4 ?????/??/??/????3 ???3 ?????',
    },
    promptsI18n: {
      'en-US': ['Help me set quarterly goals', 'Reflect on my career progress'],
      'zh-CN': ['????????', '??????????'],
    },
  },
  {
    id: 'beautiful-mermaid',
    avatar: '??',
    presetAgentType: 'codex',
    resourceDir: 'assistant/beautiful-mermaid',
    ruleFiles: {
      'en-US': 'beautiful-mermaid.md',
      'zh-CN': 'beautiful-mermaid.zh-CN.md',
    },
    defaultEnabledSkills: ['mermaid'],
    nameI18n: {
      'en-US': 'Beautiful Mermaid',
      'zh-CN': 'Beautiful Mermaid',
    },
    descriptionI18n: {
      'en-US': 'Create flowcharts, sequence diagrams, state diagrams, class diagrams, and ER diagrams with beautiful themes.',
      'zh-CN': '????????????????? ER ???????????',
    },
    promptsI18n: {
      'en-US': ['Draw a user login flowchart', 'Create an API sequence diagram', 'Draw a TCP state diagram'],
      'zh-CN': ['??????????', '???? API ???', '??? TCP ???'],
    },
  },
];
