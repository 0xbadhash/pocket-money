// src/utils/choreUtils/instanceGenerator.ts
import type { ChoreDefinition, ChoreInstance } from '../../types';

/**
 * Helper function to check if a date should generate an instance based on recurrence type
 */
function shouldGenerateInstance(date: Date, recurrenceType: string, recurrenceDay: number | null | undefined): boolean {
  if (recurrenceType === 'daily') {
    return true;
  } else if (recurrenceType === 'weekly') {
    return date.getUTCDay() === recurrenceDay;
  } else if (recurrenceType === 'monthly') {
    const dayOfMonth = date.getUTCDate();
    if (dayOfMonth === recurrenceDay) {
      return true;
    }
    // Handle recurrenceDay (e.g., 31st) for months with fewer days
    const lastDayOfMonth = new Date(date.getUTCFullYear(), date.getUTCMonth() + 1, 0).getUTCDate();
    if (recurrenceDay && recurrenceDay > lastDayOfMonth && dayOfMonth === lastDayOfMonth) {
      return true;
    }
  }
  return false;
}

/**
 * Helper function to advance the date based on recurrence type
 */
function advanceDate(date: Date, recurrenceType: string): void {
  switch (recurrenceType) {
    case 'daily':
    case 'weekly':
    case 'monthly':
      date.setUTCDate(date.getUTCDate() + 1);
      break;
    default:
      break;
  }
}

/**
 * Generates chore instances for the given definitions within a date range
 */
export function generateChoreInstances(
  definitions: ChoreDefinition[],
  periodStartDateStr: string,
  periodEndDateStr: string
): ChoreInstance[] {
  const instances: ChoreInstance[] = [];
  const periodStart = new Date(periodStartDateStr);
  periodStart.setUTCHours(0,0,0,0);
  const periodEnd = new Date(periodEndDateStr);
  periodEnd.setUTCHours(0,0,0,0);

  definitions.forEach(def => {
    if (def.isComplete) return;

    const recurrenceEndDate = def.recurrenceEndDate ? new Date(def.recurrenceEndDate) : null;
    if (recurrenceEndDate) recurrenceEndDate.setUTCHours(0,0,0,0);

    // Non-recurring chores
    if (!def.recurrenceType || def.recurrenceType === null) {
      if (def.dueDate) {
        const dueDate = new Date(def.dueDate);
        dueDate.setUTCHours(0,0,0,0);
        if (dueDate >= periodStart && dueDate <= periodEnd) {
          instances.push({
            id: `${def.id}_${def.dueDate}`,
            choreDefinitionId: def.id,
            instanceDate: def.dueDate,
            isComplete: false,
            categoryStatus: '',
            subtaskCompletions: {},
          });
        }
      }
      return;
    }

    // Recurring chores
    const definitionStartDate = def.dueDate ? new Date(def.dueDate) : null;
    if(definitionStartDate) definitionStartDate.setUTCHours(0,0,0,0);
    const currentDate = definitionStartDate && definitionStartDate > periodStart ? new Date(definitionStartDate) : new Date(periodStart);
    currentDate.setUTCHours(0,0,0,0);

    while (currentDate <= periodEnd) {
      // Skip if before definition start date
      if (definitionStartDate && currentDate < definitionStartDate) {
        advanceDate(currentDate, def.recurrenceType);
        continue;
      }

      // Stop if past recurrence end date
      if (recurrenceEndDate && currentDate > recurrenceEndDate) {
        break;
      }

      if (shouldGenerateInstance(currentDate, def.recurrenceType, def.recurrenceDay)) {
        const instanceDateStr = currentDate.toISOString().split('T')[0];
        instances.push({
          id: `${def.id}_${instanceDateStr}`,
          choreDefinitionId: def.id,
          instanceDate: instanceDateStr,
          isComplete: false,
          categoryStatus: '',
          subtaskCompletions: {},
        });
      }

      advanceDate(currentDate, def.recurrenceType);
    }
  });
  return instances;
}
