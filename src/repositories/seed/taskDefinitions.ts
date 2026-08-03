import type { TaskDefinition } from '../../models';
export const SEED_TASK_DEFINITIONS: TaskDefinition[] = [
  {
    id: 'task-open-1', title: 'Open reception and confirm front area is presentation-ready',
    description: 'Wipe down surfaces, arrange materials, ensure the reception area is tidy and welcoming.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'high',
    dueTime: '08:30', instructions: 'Check that all chairs are straight, surfaces are clean, and information materials are stocked.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-open-2', title: 'Check reception email inbox',
    description: 'Open Gmail and review any new messages received overnight.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'high',
    dueTime: '08:45', instructions: 'Log into Gmail, check reception@asg.com.au inbox. Flag urgent messages.', externalUrl: 'https://mail.google.com', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-open-3', title: 'Check today\'s calendar and appointments',
    description: 'Review Google Calendar for today\'s meetings, client visits, and appointments.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'high',
    dueTime: '08:50', instructions: 'Check the ASG shared calendar. Note any VIP visitors or special requirements.', externalUrl: 'https://calendar.google.com', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-open-4', title: 'Review missed calls and messages',
    description: 'Check the phone system for any missed calls or voicemails.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'normal',
    dueTime: '09:00', instructions: 'Check the phone system voicemail. Return any urgent calls.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-open-5', title: 'Open the CRM and review reception follow-ups',
    description: 'Log into the CRM and check for any tasks or follow-ups assigned to reception.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: false, priority: 'normal',
    instructions: 'Open the CRM system, navigate to My Tasks, review any reception-related follow-ups.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-open-6', title: 'Confirm meeting rooms are ready',
    description: 'Check that all booked meeting rooms are clean, equipped, and ready.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'high',
    dueTime: '09:15', instructions: 'Walk through each booked meeting room. Check whiteboards, AV equipment, water, and seating.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-open-7', title: 'Check printer paper and visible supplies',
    description: 'Ensure printers have adequate paper and reception supplies are stocked.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: false, priority: 'normal',
    instructions: 'Check each printer for paper levels. Top up if low. Check that reception desk has pens, notepads, and business cards.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-day-1', title: 'Answer and route incoming calls',
    description: 'Answer the phone promptly and direct calls to the right person.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'high',
    instructions: 'Answer within three rings. Identify yourself: "Good morning, ASG Brisbane Reception." Route calls or take clear messages.', relatedTrainingId: 'train-002', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-day-2', title: 'Record complete client messages',
    description: 'When taking messages, capture all key information accurately.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'high',
    instructions: 'Record: caller name, company, phone number, time of call, message details, and urgency level.', relatedTrainingId: 'train-003', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-day-3', title: 'Check reception inbox regularly',
    description: 'Monitor the reception email inbox throughout the day.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'normal',
    instructions: 'Check inbox at least every hour during business hours. Flag urgent items.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-day-4', title: 'Update appointment notes where required',
    description: 'Keep appointment records accurate in the CRM.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: false, priority: 'low',
    instructions: 'After each visitor signs in, ensure their appointment notes are updated in the CRM.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-day-5', title: 'Follow up assigned administrative tasks',
    description: 'Complete any ad-hoc administrative tasks assigned during the day.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: false, priority: 'normal',
    instructions: 'Check with management for any additional tasks that may have come up.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-closing-1', title: 'Review outstanding calls and messages',
    description: 'Ensure no calls or messages were missed during the day.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'high',
    dueTime: '16:30', instructions: 'Check voicemail and email for anything that needs attention before end of day.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-closing-2', title: 'Confirm important emails have been actioned or escalated',
    description: 'Review sent and received emails to confirm nothing has been overlooked.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'high',
    dueTime: '16:45', instructions: 'Scan inbox for any emails still needing a response. Escalate if necessary.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-closing-3', title: 'Check tomorrow\'s appointments',
    description: 'Look ahead at the next day\'s schedule.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'normal',
    dueTime: '16:55', instructions: 'Check tomorrow\'s calendar. Note any early appointments or special requirements.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-closing-4', title: 'Tidy reception and meeting rooms',
    description: 'Reset the reception area and meeting rooms for the next day.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'normal',
    dueTime: '17:00', instructions: 'Wipe down surfaces, remove used cups and plates, arrange chairs, turn off AV equipment.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-closing-5', title: 'Complete end-of-day notes',
    description: 'Log a summary of the day\'s key events.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'normal',
    dueTime: '17:10', instructions: 'Write a brief summary of the day: visitors, notable calls, issues, handover notes.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-closing-6', title: 'Confirm doors, equipment and documents are secure',
    description: 'Final security check before leaving.', category: 'daily',
    recurrence: 'daily', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'high',
    dueTime: '17:20', instructions: 'Check meeting rooms for forgotten items. Ensure filing cabinets are locked. Close blinds, turn off lights, lock front doors.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-weekly-1', title: 'Weekly printer maintenance check',
    description: 'Perform a weekly check on all printers and copiers.', category: 'printing_check',
    recurrence: 'weekly', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: false, priority: 'normal',
    instructions: 'Check all printers: paper levels, toner levels, clean glass if needed. Report any issues.', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'task-monthly-1', title: 'Monthly stock take',
    description: 'Complete the monthly stock count of office supplies.', category: 'stock_check',
    recurrence: 'monthly', assignedStaffIds: ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'], required: true, priority: 'normal',
    instructions: 'Count all stationery and kitchen supplies. Update stock levels in the Reception Hub.', relatedTrainingId: 'train-013', scope: 'organisation' as const, completionType: 'personal' as const, active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

