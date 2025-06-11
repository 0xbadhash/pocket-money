// src/utils/__tests__/choreUtils.test.ts
import { generateChoreInstances } from '../choreUtils';
import type { ChoreDefinition, ChoreInstance } from '../../types';

describe('choreUtils', () => {
  describe('generateChoreInstances', () => {
    const baseDefinition: Omit<ChoreDefinition, 'id' | 'recurrenceType' | 'dueDate' | 'recurrenceEndDate' | 'recurrenceDay'> = {
      title: 'Test Chore',
      assignedKidId: 'kid1',
      rewardAmount: 1,
      isComplete: false, // This is on definition, instance will have its own
    };

    it('should generate no instances if definitions array is empty', () => {
      const instances = generateChoreInstances([], '2024-01-01', '2024-01-07');
      expect(instances.length).toBe(0);
    });

    it('should generate no instances if period is invalid (end before start)', () => {
      const definitions: ChoreDefinition[] = [
        { ...baseDefinition, id: 'd1', recurrenceType: 'daily', dueDate: '2024-01-01', recurrenceEndDate: '2024-01-07' },
      ];
      const instances = generateChoreInstances(definitions, '2024-01-07', '2024-01-01');
      expect(instances.length).toBe(0);
    });

    // Test for recurrenceType: null (one-off chore)
    it('should generate a single instance for a one-off chore if due date is within period', () => {
      const definitions: ChoreDefinition[] = [
        { ...baseDefinition, id: 'oneoff1', recurrenceType: null, dueDate: '2024-01-03' },
      ];
      const instances = generateChoreInstances(definitions, '2024-01-01', '2024-01-05');
      expect(instances.length).toBe(1);
      expect(instances[0].choreDefinitionId).toBe('oneoff1');
      expect(instances[0].instanceDate).toBe('2024-01-03');
      expect(instances[0].isComplete).toBe(false);
    });

    it('should not generate instance for one-off chore if due date is outside period', () => {
      const definitions: ChoreDefinition[] = [
        { ...baseDefinition, id: 'oneoff2', recurrenceType: null, dueDate: '2024-01-10' },
      ];
      const instances = generateChoreInstances(definitions, '2024-01-01', '2024-01-05');
      expect(instances.length).toBe(0);
    });

    it('should not generate instance for one-off chore if no due date', () => {
      const definitions: ChoreDefinition[] = [
        { ...baseDefinition, id: 'oneoff3', recurrenceType: null, dueDate: undefined },
      ];
      const instances = generateChoreInstances(definitions, '2024-01-01', '2024-01-05');
      expect(instances.length).toBe(0);
    });

    // Test for recurrenceType: 'daily'
    it('should generate daily instances within the period respecting definition dueDate and recurrenceEndDate', () => {
      const definitions: ChoreDefinition[] = [
        { ...baseDefinition, id: 'daily1', recurrenceType: 'daily', dueDate: '2024-01-02', recurrenceEndDate: '2024-01-04' },
      ];
      // Period: Jan 1st to Jan 5th. Chore: Jan 2nd to Jan 4th. Expected: Jan 2, 3, 4.
      const instances = generateChoreInstances(definitions, '2024-01-01', '2024-01-05');
      expect(instances.length).toBe(3);
      expect(instances.map(i => i.instanceDate)).toEqual(['2024-01-02', '2024-01-03', '2024-01-04']);
      instances.forEach(inst => expect(inst.choreDefinitionId).toBe('daily1'));
    });

    it('should handle daily instances with no recurrenceEndDate (runs until end of period)', () => {
      const definitions: ChoreDefinition[] = [
        { ...baseDefinition, id: 'daily2', recurrenceType: 'daily', dueDate: '2024-01-03', recurrenceEndDate: null },
      ];
      // Period: Jan 1st to Jan 5th. Chore: Jan 3rd onwards. Expected: Jan 3, 4, 5.
      const instances = generateChoreInstances(definitions, '2024-01-01', '2024-01-05');
      expect(instances.length).toBe(3);
      expect(instances.map(i => i.instanceDate)).toEqual(['2024-01-03', '2024-01-04', '2024-01-05']);
    });

    it('should handle daily instances where chore dueDate is before period start', () => {
      const definitions: ChoreDefinition[] = [
        { ...baseDefinition, id: 'daily3', recurrenceType: 'daily', dueDate: '2023-12-30', recurrenceEndDate: '2024-01-02' },
      ];
      // Period: Jan 1st to Jan 5th. Chore: Dec 30th to Jan 2nd. Expected: Jan 1, 2.
      const instances = generateChoreInstances(definitions, '2024-01-01', '2024-01-05');
      expect(instances.length).toBe(2);
      expect(instances.map(i => i.instanceDate)).toEqual(['2024-01-01', '2024-01-02']);
    });

    // Test for recurrenceType: 'weekly'
    // (Assuming period starts on Monday for these simplified tests if day matching is exact)
    // Note: Date logic for weeks can be complex; these tests cover basic scenarios.
    // The actual implementation uses Date.getDay() where Sunday is 0, Saturday is 6.
    it('should generate weekly instances on the correct recurrenceDay within the period', () => {
      const definitions: ChoreDefinition[] = [
        // Chore on Tuesdays (recurrenceDay: 2), period includes two Tuesdays
        { ...baseDefinition, id: 'weekly1', recurrenceType: 'weekly', recurrenceDay: 2, dueDate: '2024-01-01', recurrenceEndDate: '2024-01-15' },
      ];
      // Period: Jan 1st (Mon) to Jan 14th (Sun). Expected: Jan 2nd, Jan 9th.
      const instances = generateChoreInstances(definitions, '2024-01-01', '2024-01-14');
      expect(instances.length).toBe(2);
      expect(instances.map(i => i.instanceDate)).toEqual(['2024-01-02', '2024-01-09']);
    });

    it('should not generate weekly instances if recurrenceDay is null', () => {
      const definitions: ChoreDefinition[] = [
        { ...baseDefinition, id: 'weekly_no_day', recurrenceType: 'weekly', recurrenceDay: null, dueDate: '2024-01-01', recurrenceEndDate: '2024-01-15' },
      ];
      const instances = generateChoreInstances(definitions, '2024-01-01', '2024-01-14');
      expect(instances.length).toBe(0);
    });

    // Test for recurrenceType: 'monthly'
    it('should generate monthly instances on the correct recurrenceDay (day of month) within the period', () => {
      const definitions: ChoreDefinition[] = [
        // Chore on 10th of month
        { ...baseDefinition, id: 'monthly1', recurrenceType: 'monthly', recurrenceDay: 10, dueDate: '2024-01-01', recurrenceEndDate: '2024-03-15' },
      ];
      // Period: Jan 1st to Mar 1st. Expected: Jan 10th, Feb 10th.
      const instances = generateChoreInstances(definitions, '2024-01-01', '2024-03-01');
      expect(instances.length).toBe(2);
      expect(instances.map(i => i.instanceDate)).toEqual(['2024-01-10', '2024-02-10']);
    });

    it('should correctly handle multiple definitions with various recurrence types', () => {
      const definitions: ChoreDefinition[] = [
        { ...baseDefinition, id: 'multi_daily', recurrenceType: 'daily', dueDate: '2024-01-01', recurrenceEndDate: '2024-01-02' }, // Jan 1, 2
        { ...baseDefinition, id: 'multi_oneoff', recurrenceType: null, dueDate: '2024-01-03' }, // Jan 3
        { ...baseDefinition, id: 'multi_weekly', recurrenceType: 'weekly', recurrenceDay: 4, dueDate: '2024-01-01', recurrenceEndDate: '2024-01-07' }, // Jan 4 (Thursday)
      ];
      const instances = generateChoreInstances(definitions, '2024-01-01', '2024-01-05');
      expect(instances.length).toBe(4); // Jan 1, Jan 2 (daily), Jan 3 (one-off), Jan 4 (weekly)
      const dates = instances.map(i => i.instanceDate).sort();
      expect(dates).toEqual(['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04']);
    });

    it('should generate unique instance IDs', () => {
      const definitions: ChoreDefinition[] = [
        { ...baseDefinition, id: 'daily_id_test', recurrenceType: 'daily', dueDate: '2024-01-01', recurrenceEndDate: '2024-01-03' },
      ];
      const instances = generateChoreInstances(definitions, '2024-01-01', '2024-01-03');
      expect(instances.length).toBe(3);
      const instanceIds = instances.map(i => i.id);
      expect(new Set(instanceIds).size).toBe(instanceIds.length); // Check for uniqueness
      expect(instanceIds).toEqual([
        'daily_id_test_2024-01-01',
        'daily_id_test_2024-01-02',
        'daily_id_test_2024-01-03',
      ]);
    });

  });
});
```
