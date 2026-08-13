export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'notify_member',
      description: 'Send a notification to a specific family member for low-stakes informational updates. Executes immediately, no approval needed.',
      parameters: {
        type: 'object',
        properties: {
          member_name: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['member_name', 'title', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_task_complete',
      description: 'Mark an existing chore or commitment as completed, when the user says something is already done. Executes immediately, no approval needed — completions are low-risk and easy to undo.',
      parameters: {
        type: 'object',
        properties: {
          task_title: { type: 'string', description: 'The title or close match of the chore/commitment being completed' },
          task_type: { type: 'string', enum: ['chore', 'commitment'] },
        },
        required: ['task_title', 'task_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: 'Propose a new calendar event, including birthdays, anniversaries, or celebrations. Requires family approval.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          start_date: { type: 'string', description: 'ISO 8601 datetime' },
          end_date: { type: 'string', description: 'ISO 8601 datetime' },
          location: { type: 'string' },
          category: {
            type: 'string',
            enum: ['school', 'medical', 'travel', 'financial', 'activity', 'household', 'routine', 'general', 'birthday', 'anniversary', 'celebration'],
          },
          recurrence: {
            type: 'string',
            enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quaterly', 'annually'],
            description: 'Use "annually" for birthdays and anniversaries',
          },
          related_member_names: {
            type: 'array',
            items: { type: 'string' },
            description: 'Names of family members this event is about, for birthdays/anniversaries',
          },
        },
        required: ['title', 'start_date', 'end_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_event',
      description: 'Propose moving an existing calendar event to a new time. Requires family approval.',
      parameters: {
        type: 'object',
        properties: {
          event_title: { type: 'string', description: 'Title or close match of the event to reschedule' },
          new_start_date: { type: 'string' },
          new_end_date: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['event_title', 'new_start_date', 'new_end_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_commitment',
      description: 'Propose a new commitment/task. Requires family approval.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          assigned_to_member_name: { type: 'string' },
          due_date: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_chore',
      description: 'Propose a new chore. Requires family approval.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          assigned_to_member_name: { type: 'string' },
          due_date: { type: 'string' },
          frequency: { type: 'string', enum: ['once', 'daily', 'weekly', 'monthly'] },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'flag_meal_conflict',
      description: 'Flag that a new event conflicts with this week\'s planned meal time. Requires family approval.',
      parameters: {
        type: 'object',
        properties: {
          day_of_week: { type: 'integer', description: '0 = Monday through 6 = Sunday' },
          conflicting_slot: { type: 'string', enum: ['breakfast', 'lunch', 'dinner'] },
          reason: { type: 'string' },
          suggested_new_time: { type: 'string' },
        },
        required: ['day_of_week', 'conflicting_slot', 'reason'],
      },
    },
  },
  {
  type: 'function',
  function: {
    name: 'create_story',
    description: 'Save a family story or memory when the user shares something meaningful that happened — an event, a moment, something worth remembering. Requires family approval before it\'s saved to Legacy OS.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'A short title for the story' },
        content: { type: 'string', description: 'The story itself, written naturally based on what the user shared' },
      },
      required: ['title', 'content'],
    },
  },
},
];

export const AUTO_EXECUTE_TOOLS = new Set(['notify_member', 'mark_task_complete']);