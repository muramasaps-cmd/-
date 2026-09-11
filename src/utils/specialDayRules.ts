import { SpecialDayRules } from '../data/types';

export interface PresetRuleOption {
  label: string;
  value: string;
  description: string;
  tails?: number[];
  doubleDigits?: boolean;
  monthDayZoro?: boolean;
  fixedDates?: number[];
  daysOfWeek?: string[];
}

export const PRESET_SPECIAL_DAY_RULES: PresetRuleOption[] = [
  {
    label: '5のつく日 (5日・15日・25日)',
    value: '5のつく日',
    description: 'プラザグループ・メガビーム等の看板特日',
    tails: [5],
  },
  {
    label: '7のつく日 (7日・17日・27日)',
    value: '7のつく日',
    description: 'マルハン・楽園・123・ダイエー等の王道特日',
    tails: [7],
  },
  {
    label: '3のつく日 (3日・13日・23日)',
    value: '3のつく日',
    description: 'キング観光・エスパス・サミー系推しホール',
    tails: [3],
  },
  {
    label: '8のつく日 (8日・18日・28日)',
    value: '8のつく日',
    description: 'フェイスグループ・金馬車等',
    tails: [8],
  },
  {
    label: '0のつく日 (10日・20日・30日)',
    value: '0のつく日',
    description: 'Dステーション・メガガイア・大都系推し',
    tails: [0],
  },
  {
    label: '6のつく日 (6日・16日・26日)',
    value: '6のつく日',
    description: 'PIA・ダイナム・ベルシティ等',
    tails: [6],
  },
  {
    label: '1のつく日 (1日・11日・21日・31日)',
    value: '1のつく日',
    description: '一番館・ワンダーランド・スタジアム等',
    tails: [1],
  },
  {
    label: '2のつく日 (2日・12日・22日)',
    value: '2のつく日',
    description: 'アビバ・ニコニコ・ニラク等',
    tails: [2],
  },
  {
    label: '4のつく日 (4日・14日・24日)',
    value: '4のつく日',
    description: 'フォーシーズン・パラッツォ等',
    tails: [4],
  },
  {
    label: '9のつく日 (9日・19日・29日)',
    value: '9のつく日',
    description: 'キコーナ・メッセ・テンガイ等',
    tails: [9],
  },
  {
    label: '月日ゾロ目・11日・22日',
    value: '月日ゾロ目・11日・22日',
    description: '月日ゾロ目(1/1〜12/12)および11日・22日のゾロ目特日',
    doubleDigits: true,
    monthDayZoro: true,
  },
  {
    label: '毎週末 (土曜日・日曜日)',
    value: '毎週土曜日・日曜日',
    description: '週末稼働重視・土日還元ホール',
    daysOfWeek: ['土', '日'],
  },
  {
    label: '毎月1日・15日',
    value: '毎月1日・15日',
    description: '月初の朔日・月半ば15日の固定月2回特日',
    fixedDates: [1, 15],
  },
];

/**
 * Converts zenkaku numbers to hankaku
 */
function normalizeZenkaku(str: string): string {
  return str.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
}

/**
 * Parses free text (from header or HTML) into structured SpecialDayRules
 */
export function parseSpecialDayRulesFromText(rawText: string): SpecialDayRules {
  if (!rawText || !rawText.trim()) {
    return {
      customDescription: '特日未設定',
    };
  }

  const text = normalizeZenkaku(rawText.trim());
  const rules: SpecialDayRules = {
    customDescription: rawText.trim(),
  };

  // 1. Detect tails: e.g. "5のつく日", "7のつく日", "3, 9のつく日", "末尾5"
  const tailsSet = new Set<number>();

  const tailMatches = text.match(/([0-9])\s*のつく日/g);
  if (tailMatches) {
    tailMatches.forEach((m) => {
      const digit = m.match(/([0-9])/);
      if (digit) tailsSet.add(parseInt(digit[1], 10));
    });
  }

  const matsubiMatches = text.match(/末尾\s*([0-9])/g);
  if (matsubiMatches) {
    matsubiMatches.forEach((m) => {
      const digit = m.match(/([0-9])/);
      if (digit) tailsSet.add(parseInt(digit[1], 10));
    });
  }

  // 2. Double digits and Month-Day Zoro
  if (text.includes('ゾロ目') || text.includes('11日') || text.includes('22日')) {
    rules.doubleDigits = true;
    rules.monthDayZoro = true;
  }

  // 3. Day of week: "土日", "土曜日", "毎週土日"
  const dowList: string[] = [];
  if (text.includes('土曜') || text.includes('土日') || text.includes('土')) {
    dowList.push('土');
  }
  if (text.includes('日曜') || text.includes('土日') || text.includes('日')) {
    dowList.push('日');
  }
  if (dowList.length > 0) {
    rules.daysOfWeek = dowList;
  }

  // 4. Check for explicit day listings like "5日, 15日, 25日" or "7日・17日・27日"
  const dayListMatches = text.match(/([0-9]{1,2})\s*日/g);
  if (dayListMatches && dayListMatches.length >= 2) {
    const parsedDays = Array.from(
      new Set(
        dayListMatches
          .map((m) => {
            const num = m.match(/([0-9]{1,2})/);
            return num ? parseInt(num[1], 10) : 0;
          })
          .filter((d) => d >= 1 && d <= 31)
      )
    ).sort((a, b) => a - b);

    // If all listed days share the same tail (e.g. 5, 15, 25 -> all % 10 === 5)
    if (parsedDays.length >= 2) {
      const firstTail = parsedDays[0] % 10;
      const allSameTail = parsedDays.every((d) => d % 10 === firstTail);
      if (allSameTail) {
        tailsSet.add(firstTail);
      } else {
        rules.fixedDates = parsedDays;
      }
    }
  } else if (dayListMatches && dayListMatches.length === 1 && tailsSet.size === 0) {
    const singleDay = parseInt(dayListMatches[0].match(/([0-9]{1,2})/)![1], 10);
    if (singleDay >= 1 && singleDay <= 31) {
      rules.fixedDates = [singleDay];
    }
  }

  if (tailsSet.size > 0) {
    rules.tails = Array.from(tailsSet).sort((a, b) => a - b);
  }

  return rules;
}

export interface RuleDefinition {
  modeName: string;
  targetDays: number[];
  targetDaysLabel: string;
  dayLabels: { day: number; label: string; role: string }[];
  trapDays: {
    targetDays: number[];
    beforeDays: number[];
    afterDays: number[];
    targetLabel: string;
    beforeLabel: string;
    afterLabel: string;
  };
  earlyDay: number;
  lateDay: number;
  earlyDayName: string;
  lateDayName: string;
  hasZoro: boolean;
}

/**
 * Generates concrete recurring day configuration from SpecialDayRules and raw text.
 * Ensures stores like Plaza 515 (5のつく日) get [5, 15, 25],
 * 7のつく日 get [7, 17, 27], ゾロ目 get [11, 22, zoro], etc.
 */
export function getSpecialDayRuleDefinition(
  rules?: SpecialDayRules,
  oldEventDaysText?: string
): RuleDefinition {
  // Parse or normalize rules
  const activeRules =
    rules && (rules.tails || rules.doubleDigits || rules.fixedDates || rules.monthDayZoro)
      ? rules
      : parseSpecialDayRulesFromText(oldEventDaysText || '');

  // Case 1: Tail-based rules (e.g. 5のつく日, 7のつく日, 3のつく日...)
  if (activeRules.tails && activeRules.tails.length > 0) {
    const tail = activeRules.tails[0];
    let days: number[] = [];
    if (tail === 0) {
      days = [10, 20, 30];
    } else {
      days = [tail, tail + 10, tail + 20];
    }

    const beforeDays = days.map((d) => d - 1).filter((d) => d >= 1);
    const afterDays = days.map((d) => d + 1).filter((d) => d <= 31);

    const roles = ['初撃特日', '中盤特日', '終盤本命特日'];
    const dayLabels = days.map((d, i) => ({
      day: d,
      label: `毎月${d}日`,
      role: roles[i] || '特定日',
    }));

    return {
      modeName: `${tail}のつく日`,
      targetDays: days,
      targetDaysLabel: `${days.map((d) => `${d}日`).join('・')}`,
      dayLabels,
      trapDays: {
        targetDays: days,
        beforeDays,
        afterDays,
        targetLabel: `${days.map((d) => `${d}日`).join('・')}`,
        beforeLabel: `${beforeDays.map((d) => `${d}日`).join('・')}`,
        afterLabel: `${afterDays.map((d) => `${d}日`).join('・')}`,
      },
      earlyDay: days[0],
      lateDay: days[days.length - 1],
      earlyDayName: `${days[0]}日`,
      lateDayName: `${days[days.length - 1]}日`,
      hasZoro: false,
    };
  }

  // Case 2: Fixed dates (e.g. 毎月1日・15日)
  if (activeRules.fixedDates && activeRules.fixedDates.length > 0) {
    const days = [...activeRules.fixedDates].sort((a, b) => a - b);
    const beforeDays = days.map((d) => d - 1).filter((d) => d >= 1);
    const afterDays = days.map((d) => d + 1).filter((d) => d <= 31);

    const dayLabels = days.map((d, i) => ({
      day: d,
      label: `毎月${d}日`,
      role: i === 0 ? '前半特日' : i === days.length - 1 ? '後半特日' : '中盤特日',
    }));

    return {
      modeName: `毎月${days.map((d) => `${d}日`).join('・')}`,
      targetDays: days,
      targetDaysLabel: `${days.map((d) => `${d}日`).join('・')}`,
      dayLabels,
      trapDays: {
        targetDays: days,
        beforeDays,
        afterDays,
        targetLabel: `${days.map((d) => `${d}日`).join('・')}`,
        beforeLabel: `${beforeDays.map((d) => `${d}日`).join('・')}`,
        afterLabel: `${afterDays.map((d) => `${d}日`).join('・')}`,
      },
      earlyDay: days[0],
      lateDay: days[days.length - 1],
      earlyDayName: `${days[0]}日`,
      lateDayName: `${days[days.length - 1]}日`,
      hasZoro: false,
    };
  }

  // Case 3: Double digits / Zoro / 11・22
  if (activeRules.doubleDigits || activeRules.monthDayZoro) {
    const days = [11, 22];
    const beforeDays = [10, 21];
    const afterDays = [12, 23];

    return {
      modeName: '月日ゾロ目・11日・22日',
      targetDays: days,
      targetDaysLabel: '月日ゾロ目・11日・22日',
      dayLabels: [
        { day: -1, label: '月日ゾロ目', role: '月初ゾロ目' },
        { day: 11, label: '毎月11日', role: '月前半特日' },
        { day: 22, label: '毎月22日', role: '月後半本命特日' },
      ],
      trapDays: {
        targetDays: [11, 22],
        beforeDays,
        afterDays,
        targetLabel: '11日・22日',
        beforeLabel: '10日・21日',
        afterLabel: '12日・23日',
      },
      earlyDay: 11,
      lateDay: 22,
      earlyDayName: '11日',
      lateDayName: '22日',
      hasZoro: true,
    };
  }

  // Case 4: Weekend (土・日)
  if (activeRules.daysOfWeek && activeRules.daysOfWeek.length > 0) {
    return {
      modeName: `毎週${activeRules.daysOfWeek.join('・')}曜日`,
      targetDays: [],
      targetDaysLabel: `毎週${activeRules.daysOfWeek.join('・')}曜日`,
      dayLabels: activeRules.daysOfWeek.map((dow) => ({
        day: 0,
        label: `毎週${dow}曜日`,
        role: `${dow}曜特日`,
      })),
      trapDays: {
        targetDays: [],
        beforeDays: [],
        afterDays: [],
        targetLabel: '週末特日',
        beforeLabel: '前日(金曜等)',
        afterLabel: '翌日(月曜等)',
      },
      earlyDay: 0,
      lateDay: 0,
      earlyDayName: activeRules.daysOfWeek[0] + '曜',
      lateDayName: activeRules.daysOfWeek[activeRules.daysOfWeek.length - 1] + '曜',
      hasZoro: false,
    };
  }

  // Fallback: Default to 5のつく日 if text mentions 5, or 7s if 7, or general
  const text = oldEventDaysText || '';
  if (text.includes('5')) {
    return getSpecialDayRuleDefinition({ tails: [5] });
  }
  if (text.includes('7')) {
    return getSpecialDayRuleDefinition({ tails: [7] });
  }

  // Generic fallback: 5日, 15日, 25日
  return {
    modeName: '5のつく日',
    targetDays: [5, 15, 25],
    targetDaysLabel: '5日・15日・25日',
    dayLabels: [
      { day: 5, label: '毎月5日', role: '初撃特日' },
      { day: 15, label: '毎月15日', role: '中盤特日' },
      { day: 25, label: '毎月25日', role: '終盤本命特日' },
    ],
    trapDays: {
      targetDays: [5, 15, 25],
      beforeDays: [4, 14, 24],
      afterDays: [6, 16, 26],
      targetLabel: '5日・15日・25日',
      beforeLabel: '4日・14日・24日',
      afterLabel: '6日・16日・26日',
    },
    earlyDay: 5,
    lateDay: 25,
    earlyDayName: '5日',
    lateDayName: '25日',
    hasZoro: false,
  };
}
