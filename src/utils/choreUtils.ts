// src/utils/choreUtils.ts
import type { ChoreDefinition, ChoreInstance } from '../types';

/**
 * Generates chore instances for all active chore definitions within a given date range.
 * @param definitions - Array of chore definitions to generate instances for
 * @param periodStartDateStr - Start date of the period (YYYY-MM-DD)
 * @param periodEndDateStr - End date of the period (YYYY-MM-DD)
 * @returns Array of generated chore instances
 */
export function generateChoreInstances(
  definitions: ChoreDefinition[],
  periodStartDateStr: string,
  periodEndDateStr: string
): ChoreInstance[] {
  const instances: ChoreInstance[] = [];
  const periodStart = new Date(periodStartDateStr);
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodEnd = new Date(periodEndDateStr);
  periodEnd.setUTCHours(0, 0, 0, 0);

  definitions.forEach((def) => {
    if (def.isComplete) return;

    const recurrenceEndDate = def.recurrenceEndDate
      ? new Date(def.recurrenceEndDate)
      : null;
    if (recurrenceEndDate) recurrenceEndDate.setUTCHours(0, 0, 0, 0);

    // Non-recurring chores
    if (!def.recurrenceType || def.recurrenceType === null) {
      if (def.dueDate) {
        const dueDate = new Date(def.dueDate);
        dueDate.setUTCHours(0, 0, 0, 0);
        if (dueDate >= periodStart && dueDate <= periodEnd) {
          instances.push({
            id: `${def.id}_${def.dueDate}`,
            choreDefinitionId: def.id,
            instanceDate: def.dueDate,
            isComplete: false,
            categoryStatus: 'TO_DO',
            subtaskCompletions: {},
          });
        }
      }
      return;
    }

    // Recurring chores
    const definitionStartDate = def.dueDate
      ? new Date(def.dueDate)
      : null;
    if (definitionStartDate) definitionStartDate.setUTCHours(0, 0, 0, 0);

    const currentDate =
      definitionStartDate && definitionStartDate > periodStart
        ? new Date(definitionStartDate)
        : new Date(periodStart);
    currentDate.setUTCHours(0, 0, 0, 0);

    while (currentDate <= periodEnd) {
      // Skip if before definition's start date
      if (definitionStartDate && currentDate < definitionStartDate) {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        continue;
      }

      // Stop if recurrence end date has passed
      if (recurrenceEndDate && currentDate > recurrenceEndDate) {
        break;
      }

      let shouldCreateInstance = false;
      if (def.recurrenceType === 'daily') {
        shouldCreateInstance = true;
      } else if (def.recurrenceType === 'weekly') {
        shouldCreateInstance = currentDate.getUTCDay() === def.recurrenceDay;
      } else if (def.recurrenceType === 'monthly') {
        const dayOfMonth = currentDate.getUTCDate();
        if (dayOfMonth === def.recurrenceDay) {
          shouldCreateInstance = true;
        } else {
          // Handle months with fewer days than recurrenceDay
          const lastDayOfMonth = new Date(
            currentDate.getUTCFullYear(),
            currentDate.getUTCMonth() + 1,
            0
          ).getUTCDate();
          if (
            def.recurrenceDay &&
            def.recurrenceDay > lastDayOfMonth &&
            dayOfMonth === lastDayOfMonth
          ) {
            shouldCreateInstance = true;
          }
        }
      }

      if (shouldCreateInstance) {
        const instanceDateStr = currentDate.toISOString().split('T')[0];
        instances.push({
          id: `${def.id}_${instanceDateStr}`,
          choreDefinitionId: def.id,
          instanceDate: instanceDateStr,
          isComplete: false,
          categoryStatus: 'TO_DO',
          subtaskCompletions: {},
        });
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  });

  return instances;
}
