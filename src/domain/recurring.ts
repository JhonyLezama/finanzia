import { dueDateForMonth } from './dates';
import type { Category, MonthKey, PlanItem, RecurringRule } from './models';

export type GeneratedPlanItem = Omit<
  PlanItem,
  'id' | 'createdAt' | 'updatedAt' | 'status'
>;

export interface GeneratePlanItemsInput {
  month: MonthKey;
  rules: RecurringRule[];
  existing: PlanItem[];
  categories: Category[];
}

function categoryMatchesRule(category: Category, rule: RecurringRule): boolean {
  if (rule.kind === 'fixed_expense') {
    return category.kind === 'expense' && category.group === 'fixed';
  }
  return category.kind === 'income' && category.group === 'income';
}

export function generatePlanItemsForMonth({
  month,
  rules,
  existing,
  categories,
}: GeneratePlanItemsInput): GeneratedPlanItem[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const existingRuleIds = new Set(
    existing
      .filter((item) => item.planId === month && item.recurringRuleId !== undefined)
      .map((item) => item.recurringRuleId as string),
  );

  return rules
    .filter((rule) => {
      if (rule.active !== 1) {
        return false;
      }
      if (rule.startMonth > month) {
        return false;
      }
      if (rule.endMonth && month > rule.endMonth) {
        return false;
      }
      if (existingRuleIds.has(rule.id)) {
        return false;
      }
      const category = categoryById.get(rule.categoryId);
      return category !== undefined && categoryMatchesRule(category, rule);
    })
    .map((rule) => ({
      planId: month,
      kind: rule.kind,
      name: rule.name,
      categoryId: rule.categoryId,
      amountCents: rule.amountCents,
      dueDate: dueDateForMonth(month, rule.dayOfMonth),
      recurringRuleId: rule.id,
      note: rule.note,
    }));
}
