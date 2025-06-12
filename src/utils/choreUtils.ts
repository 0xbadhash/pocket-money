// src/utils/choreUtils.ts
import type { ChoreDefinition, ChoreInstance } from '../types';
import { getTodayDateString } from './dateUtils'; // Assuming you might need this or other date functions

export function generateChoreInstances(
  definitions: ChoreDefinition[],
  periodStartDateStr: string,
  periodEndDateStr: string
): ChoreInstance[] {
  const instances: ChoreInstance[] = [];
  const periodStart = new Date(periodStartDateStr);
  periodStart.setUTCHours(0,0,0,0); // Normalize to start of day UTC
  const periodEnd = new Date(periodEndDateStr);
  periodEnd.setUTCHours(0,0,0,0); // Normalize to start of day UTC

  definitions.forEach(def => {
    if (def.isComplete) return; // Skip archived/disabled definitions

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
            isComplete: false, // Default new instances to incomplete
          });
        }
      }
      return;
    }

    // Recurring chores
    // Start date for iteration: Max of definition start date or period start date
    const definitionStartDate = def.dueDate ? new Date(def.dueDate) : null;
    if(definitionStartDate) definitionStartDate.setUTCHours(0,0,0,0);
    let currentDate = definitionStartDate && definitionStartDate > periodStart ? new Date(definitionStartDate) : new Date(periodStart);
    currentDate.setUTCHours(0,0,0,0);

    while (currentDate <= periodEnd) {
      // Ensure current date is not before the definition's overall start date
      if (definitionStartDate && currentDate < definitionStartDate) {
        if (def.recurrenceType === 'daily') { currentDate.setUTCDate(currentDate.getUTCDate() + 1); continue; }
        if (def.recurrenceType === 'weekly') { currentDate.setUTCDate(currentDate.getUTCDate() + 1); continue; } // Check next day for weekly
        if (def.recurrenceType === 'monthly') { currentDate.setUTCDate(currentDate.getUTCDate() + 1); continue; } // Check next day for monthly
      }

      // Stop if recurrence end date is passed
      if (recurrenceEndDate && currentDate > recurrenceEndDate) {
        break;
      }

      let shouldCreateInstance = false;
      if (def.recurrenceType === 'daily') {
        shouldCreateInstance = true;
      } else if (def.recurrenceType === 'weekly') {
        if (currentDate.getUTCDay() === def.recurrenceDay) {
          shouldCreateInstance = true;
        }
      } else if (def.recurrenceType === 'monthly') {
        const dayOfMonth = currentDate.getUTCDate();
        if (dayOfMonth === def.recurrenceDay) {
          shouldCreateInstance = true;
        } else {
          // Handle recurrenceDay (e.g., 31st) for months with fewer days.
          // Create instance on the last day of the month if recurrenceDay is beyond month length.
          const lastDayOfMonth = new Date(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 0).getUTCDate();
          if (def.recurrenceDay && def.recurrenceDay > lastDayOfMonth && dayOfMonth === lastDayOfMonth) {
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
          isComplete: false, // Default new instances to incomplete
        });
      }

      // Advance currentDate
      if (def.recurrenceType === 'daily') {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      } else if (def.recurrenceType === 'weekly') {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      } else if (def.recurrenceType === 'monthly') {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      } else {
        break; // Should not happen
      }
    }
  });
  return instances;
}
