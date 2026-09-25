export type StatusTone = 'ok' | 'warn' | 'blocked' | 'idle'

export const UNIT = {
  id: 'R-1842',
  name: 'Hydraulic Pump',
  model: 'HPX-400',
  customer: 'Northstar Industrial',
  order: 'SO-20784',
  station: 'Assembly',
  grade: 'B',
  promised: 'Aug 14',
  status: 'Blocked — quality hold',
  tone: 'blocked' as StatusTone,
}

/** Hero visual: the operations tab's scripted question and structured answer. */
export const HERO_OPERATIONS = {
  question: 'Which units are at risk of missing their ship date this week?',
  stat: '3 units at risk',
  units: [
    {
      id: '#2841',
      tone: 'blocked' as StatusTone,
      title: 'On quality hold after final inspection.',
      detail: 'Shaft runout exceeds tolerance.',
    },
    {
      id: '#2917',
      tone: 'blocked' as StatusTone,
      title: 'Waiting for replacement bearing BR-482.',
      detail: 'Expected Thursday.',
    },
    {
      id: '#2876',
      tone: 'warn' as StatusTone,
      title: 'Teardown revealed additional housing damage',
      detail: 'not identified during intake.',
    },
  ],
  recommendation:
    'Prioritize bearing procurement for #2917 and route #2876 to secondary inspection.',
  sources: ['ERP', 'Work Orders', 'Inspection Records', 'Inventory', 'Quality'],
}

/** Hero visual: the technician tab's scripted question and structured answer. */
export const HERO_TECHNICIAN = {
  question: 'Unit #2841 failed final test with excessive vibration. What should I check?',
  checks: [
    'Measure shaft runout — maximum 0.003"',
    'Inspect coupling alignment',
    'Verify bearing preload',
    'Check the bearing seat for housing wear',
  ],
  documentation: ['OEM Service Manual §7.4', 'Service Bulletin SB-114', 'Internal Rebuild SOP #23'],
  similarRepair: {
    unit: '#2197',
    text: 'Unit #2197 had the same test result. Root cause was an out-of-spec coupling.',
  },
  sources: ['OEM Manual', 'Service Bulletin', 'Internal SOP', 'Repair History'],
}

/**
 * A facsimile of the source system's own screen. Each system renders in the shape
 * it actually uses — a record of fields, an operation list, a file browser, a chat
 * thread — so the section reads as five different pieces of software rather than
 * five paragraphs about software.
 */
export type SourceScreen =
  | {
      kind: 'fields'
      fields: { label: string; value: string; tone?: StatusTone }[]
    }
  | {
      kind: 'table'
      columns: string[]
      rows: { cells: string[]; tone?: StatusTone }[]
    }
  | {
      kind: 'files'
      files: { name: string; meta: string }[]
      empty: string
    }
  | {
      kind: 'message'
      from: string
      avatar: string
      time: string
      reply: { from: string; time: string; body: string }
    }

export type Source = {
  key: string
  label: string
  detail: string
  /** The system's own chrome-bar identifier, e.g. the record it has open. */
  recordId: string
  /** The stamp each system shows for its own freshness. */
  stamp: string
  answer: string
  caveat: string
  failure: string
  /** Why this system, on its own, cannot answer the question. */
  problem: string
  /** Running cost of the search by the time you have checked this system. */
  elapsed: string
  tone: StatusTone
  screen: SourceScreen
}

/** Demo 1: five systems, five partial and conflicting answers. */
export const SOURCES: Source[] = [
  {
    key: 'erp',
    label: 'ERP',
    detail: 'Work order module',
    recordId: 'WO-20784',
    stamp: 'Synced Jul 28 · 15:19',
    answer: 'Status: In Repair.',
    caveat: 'Last updated 2 days ago.',
    failure: 'Stale',
    problem:
      'The ERP only knows what someone last typed into it. Nobody has touched this ' +
      'record since Jul 28, so it confidently reports a status from before the hold ' +
      'was even raised.',
    elapsed: 'System 1 of 5 · 4 min in',
    tone: 'warn',
    screen: {
      kind: 'fields',
      fields: [
        { label: 'Work centre', value: 'Repair cell 2' },
        { label: 'Current operation', value: 'Not recorded', tone: 'idle' },
        { label: 'Assigned to', value: 'Unassigned', tone: 'idle' },
        { label: 'Last status change', value: 'Jul 28 · 15:19', tone: 'warn' },
        { label: 'Promised date', value: 'Aug 14' },
      ],
    },
  },
  {
    key: 'mes',
    label: 'MES',
    detail: 'Shop floor execution',
    recordId: 'R-1842 · routing',
    stamp: 'Live · 10:32',
    answer: 'No repair operation has been started.',
    caveat: 'Directly contradicts the ERP.',
    failure: 'Conflicting',
    problem:
      'The MES is right about the floor, and it says the opposite of the ERP. Nothing ' +
      'in either system tells you which one to believe, so now you have to go and ask ' +
      'somebody.',
    elapsed: 'System 2 of 5 · 9 min in',
    tone: 'blocked',
    screen: {
      kind: 'table',
      columns: ['Op', 'Station', 'State'],
      rows: [
        { cells: ['30', 'Disassembly', 'Complete'], tone: 'ok' },
        { cells: ['40', 'Inspection', 'Complete'], tone: 'ok' },
        { cells: ['50', 'Repair', 'Not started'], tone: 'blocked' },
        { cells: ['60', 'Test', 'Not started'], tone: 'idle' },
      ],
    },
  },
  {
    key: 'qms',
    label: 'Quality system',
    detail: 'Holds and nonconformance',
    recordId: 'QH-441',
    stamp: 'Opened Jul 29 · 09:48',
    answer: 'Hold QH-441 open, awaiting disposition.',
    caveat: 'Never propagated to the ERP.',
    failure: 'Siloed',
    problem:
      'This is the hold that explains everything, and it was never pushed to the ERP ' +
      'or the work order. You only ever find it if you already suspected it was there ' +
      'and thought to check.',
    elapsed: 'System 3 of 5 · 15 min in',
    tone: 'blocked',
    screen: {
      kind: 'fields',
      fields: [
        { label: 'Raised by', value: 'Inspection · M. Reyes' },
        { label: 'Reason', value: 'Bore runout 0.042 mm', tone: 'blocked' },
        { label: 'Tolerance', value: 'Limit 0.030 mm' },
        { label: 'Disposition', value: 'Awaiting decision', tone: 'warn' },
        { label: 'Notified', value: 'Quality only', tone: 'idle' },
      ],
    },
  },
  {
    key: 'drive',
    label: 'Shared drive',
    detail: '/inspection/2026-07/',
    recordId: '/inspection/2026-07/',
    stamp: '3 items · 12.1 MB',
    answer: '3 photos. IMG_2481.jpg, IMG_2482.jpg, IMG_2483.jpg.',
    caveat: 'No unit reference, no findings, no author.',
    failure: 'Unstructured',
    problem:
      'The photos show the defect, but nothing connects them to the unit, the work ' +
      'order, or the inspector who took them. They are only useful to someone who ' +
      'already knows what they are looking at.',
    elapsed: 'System 4 of 5 · 21 min in',
    tone: 'idle',
    screen: {
      kind: 'files',
      files: [
        { name: 'IMG_2481.jpg', meta: 'JPEG · 4.2 MB · Jul 29 09:44' },
        { name: 'IMG_2482.jpg', meta: 'JPEG · 3.8 MB · Jul 29 09:45' },
        { name: 'IMG_2483.jpg', meta: 'JPEG · 4.1 MB · Jul 29 09:46' },
      ],
      empty: 'No linked unit · no linked work order · no author',
    },
  },
  {
    key: 'people',
    label: 'Shift supervisor',
    detail: 'Verbal',
    recordId: 'Floor radio · 2nd shift',
    stamp: 'Today · 07:40',
    answer: "Pretty sure it's waiting on a seal kit. Ask Elena.",
    caveat: 'Elena is on second shift.',
    failure: 'Tribal knowledge',
    problem:
      'The closest thing to a real answer is in somebody’s head, and they are ' +
      'hedging. The one person who actually knows does not start until 15:00, so the ' +
      'question waits for her.',
    elapsed: 'System 5 of 5 · 28 min in',
    tone: 'warn',
    screen: {
      kind: 'message',
      from: 'D. Marsh',
      avatar: 'DM',
      time: 'Today · 07:40',
      reply: {
        from: 'You',
        time: 'Today · 07:41',
        body: 'When is Elena in?',
      },
    },
  },
]

export const RECONCILED = {
  /** The state of the search once all five systems have been checked. */
  tally: {
    stats: [
      { value: '5', label: 'systems checked' },
      { value: '28', label: 'minutes spent' },
      { value: '0', label: 'clear answers', tone: 'blocked' as StatusTone },
    ],
    detail:
      'Two of them contradict each other, the hold that explains it was never ' +
      'propagated, and not one of them mentions the parts shortage that is actually ' +
      'holding the unit.',
  },
  heading: 'One answer, backed by every source.',
  lead:
    'Sorno reads across all your systems, reconciles what they say, and gives your ' +
    'team one answer with the evidence attached — in one place, in seconds.',
  recordId: 'R-1842 · unit record',
  stamp: 'Answered in seconds · one place to look',
  headline: 'R-1842 is blocked on quality hold QH-441.',
  body:
    'The hold was opened yesterday at 09:48 by Inspection. The unit is physically at ' +
    'Assembly, but no repair operation has started because seal kit P/N 4471-B is short. ' +
    'This blocks sales order SO-20784, promised Aug 14. Owner: Elena R.',
  conflict:
    'The ERP and MES disagree on status. Sorno flagged the conflict rather than picking one.',
  sources: ['ERP', 'MES', 'Quality system', 'Inventory', 'Inspection record'],
}

/** Demo 2: the unit record tabs. */
export const TIMELINE = [
  { time: 'Jul 28 · 14:02', event: 'Unit received at dock', actor: 'Receiving', source: 'ERP' },
  { time: 'Jul 28 · 15:19', event: 'Identified and matched to SO-20784', actor: 'D. Okafor', source: 'ERP' },
  { time: 'Jul 29 · 08:30', event: 'Initial inspection started', actor: 'M. Reyes', source: 'MES' },
  { time: 'Jul 29 · 09:48', event: 'Defect found — scoring on shaft bore', actor: 'M. Reyes', source: 'Inspection' },
  { time: 'Jul 29 · 09:48', event: 'Quality hold QH-441 opened', actor: 'Quality', source: 'QMS', tone: 'blocked' as StatusTone },
  { time: 'Jul 29 · 11:05', event: 'Condition graded B — repairable', actor: 'M. Reyes', source: 'Inspection' },
  { time: 'Jul 30 · 07:12', event: 'Seal kit P/N 4471-B short — 0 on hand', actor: 'Inventory', source: 'WMS', tone: 'blocked' as StatusTone },
  { time: 'Jul 30 · 10:32', event: 'Reassembly blocked, awaiting parts', actor: 'E. Novak', source: 'MES', tone: 'warn' as StatusTone },
]

export const FINDINGS = [
  { label: 'Condition grade', value: 'B — repairable' },
  { label: 'Primary failure mode', value: 'Seal degradation, secondary bore scoring' },
  { label: 'Shaft bore runout', value: '0.042 mm (limit 0.030 mm)', tone: 'blocked' as StatusTone },
  { label: 'Housing', value: 'Serviceable, no cracks' },
  { label: 'Inspector', value: 'M. Reyes' },
  { label: 'Photos', value: '3 attached' },
]

export const PARTS = [
  { pn: '4471-B', desc: 'Seal kit', origin: 'New — supplier', status: 'Short, 0 on hand', tone: 'blocked' as StatusTone },
  { pn: '2210-C', desc: 'Drive shaft', origin: 'Recovered from core C-9920', status: 'Inspected, reusable', tone: 'ok' as StatusTone },
  { pn: '8830-A', desc: 'Pump housing', origin: 'Original to this unit', status: 'Serviceable', tone: 'ok' as StatusTone },
  { pn: '5502-D', desc: 'Bearing set', origin: 'New — supplier', status: 'Reserved', tone: 'ok' as StatusTone },
  { pn: '1140-F', desc: 'Valve plate', origin: 'Original to this unit', status: 'Scrapped, out of tolerance', tone: 'warn' as StatusTone },
]

export const QUALITY = [
  { label: 'QH-441', detail: 'Quality hold — bore runout out of tolerance', status: 'Open', tone: 'blocked' as StatusTone },
  { label: 'NCR-2081', detail: 'Nonconformance — shaft bore scoring', status: 'Under review', tone: 'warn' as StatusTone },
  { label: 'Pressure test #1', detail: 'Failed at 2,800 psi, spec 3,200 psi', status: 'Failed', tone: 'blocked' as StatusTone },
  { label: 'Pressure test #2', detail: 'Retest after seal replacement', status: 'Not started', tone: 'idle' as StatusTone },
  { label: 'Dimensional check', detail: 'Housing and mounting face', status: 'Passed', tone: 'ok' as StatusTone },
]

export const DOCUMENTS = [
  { name: 'Inspection form INS-4471', meta: 'PDF · Jul 29 · M. Reyes', source: 'Inspection' },
  { name: 'HPX-400 service manual, §4 Reassembly', meta: 'PDF · rev C', source: 'Documents' },
  { name: 'Torque specification sheet', meta: 'PDF · rev A', source: 'Engineering' },
  { name: 'Pressure test report #1', meta: 'PDF · Jul 30', source: 'QMS' },
  { name: 'Technician note — E. Novak', meta: 'Text · Jul 30 · 10:32', source: 'MES' },
]

export const RECORD_TABS = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'inspection', label: 'Inspection' },
  { key: 'parts', label: 'Parts & lineage' },
  { key: 'quality', label: 'Quality' },
  { key: 'documents', label: 'Documents' },
]

/** Demo 3: preset questions, each replayed as a short chat rather than a single Q&A.
 * The opening message is what a viewer picks from the list; everything after it is a
 * scripted follow-up, so the thread reads as a real exchange, not a live chat input. */
export type ChatTurn =
  | { role: 'user'; text: string }
  | {
      role: 'sorno'
      text: string
      sources: string[]
      note?: string | null
      /** A generated document, shown as an attachment rather than inline text. */
      attachment?: { name: string; meta: string }
    }

export const QUESTIONS: { thread: ChatTurn[] }[] = [
  {
    thread: [
      { role: 'user', text: 'Which units are blocked by missing parts?' },
      {
        role: 'sorno',
        text:
          'Seven units are blocked on parts. Four are waiting on bearing assemblies, two on ' +
          'seal kits, and one on an approved replacement housing. R-1842 has been blocked ' +
          'longest at 6.3 days and is the only one tied to a promised date this week.',
        sources: ['ERP', 'Inventory', 'MES'],
        note: null,
      },
      { role: 'user', text: "What's R-1842 waiting on, exactly, and when does it clear?" },
      {
        role: 'sorno',
        text:
          'Seal kit P/N 4471-B, zero on hand. A purchase order was placed Jul 30 with an ' +
          'expected arrival of Aug 11 — three days ahead of the Aug 14 promise, if nothing ' +
          'else slips. It is the only open blocker; the unit is otherwise ready for reassembly.',
        sources: ['Inventory', 'ERP'],
        note: 'Aug 11 is the supplier’s commit date, not a confirmed receipt.',
      },
      { role: 'user', text: 'Create a task for Elena to clear QH-441, and alert me if the seal kit will miss Aug 11.' },
      {
        role: 'sorno',
        text:
          'Done. A task to clear QH-441 is assigned to Elena, and you’ll get an alert if the ' +
          '4471-B seal kit hasn’t shipped by Aug 11.',
        sources: [],
        note: null,
      },
    ],
  },
  {
    thread: [
      { role: 'user', text: "What's at risk of missing its promised date this week?" },
      {
        role: 'sorno',
        text:
          'Three orders are at risk. SO-20784 (R-1842, promised Aug 14) is blocked on a quality ' +
          'hold and a parts shortage. SO-20791 and SO-20802 are both waiting on the same bearing ' +
          'assembly, expected to arrive Aug 11.',
        sources: ['ERP', 'Inventory', 'QMS'],
        note: null,
      },
      { role: 'user', text: 'Are 20791 and 20802 really stuck on the exact same part?' },
      {
        role: 'sorno',
        text:
          'Yes — both need bearing assembly P/N 5502-D, and one incoming shipment of 12 units ' +
          'is expected Aug 11. That covers both orders with room to spare, so neither should ' +
          'slip once the shipment lands.',
        sources: ['Inventory', 'ERP'],
        note: 'Assumes the Aug 11 delivery arrives on schedule; the supplier has not confirmed shipment.',
      },
      { role: 'user', text: 'Draft customer updates for the three at-risk orders with the latest expected ship dates.' },
      {
        role: 'sorno',
        text:
          'Drafted. Each update names the order’s current expected ship date and the reason ' +
          'for the delay, ready for your review before anything goes to the customer.',
        sources: ['ERP', 'Inventory'],
        note: 'Draft only — nothing is sent until you approve it.',
        attachment: { name: 'Customer-updates_SO-20784-91-802.pdf', meta: 'PDF · 3 orders · draft' },
      },
    ],
  },
  {
    thread: [
      { role: 'user', text: 'Why has R-1842 been in inspection for three days?' },
      {
        role: 'sorno',
        text:
          'It left inspection on Jul 29 at 11:05. The ERP still shows it in inspection because ' +
          'its status has not been updated since Jul 28. The MES shows it at Assembly, blocked ' +
          'on quality hold QH-441 and a seal kit shortage.',
        sources: ['ERP', 'MES', 'QMS'],
        note: 'The ERP record is stale. Sorno is reporting the MES position and flagging the conflict.',
      },
      { role: 'user', text: 'So which system do I actually trust — ERP or MES?' },
      {
        role: 'sorno',
        text:
          'For physical location and operation state, trust the MES — it is the system of ' +
          'record for the floor and updates in real time. The ERP stays authoritative for ' +
          'commercial data like promise dates and pricing, but nobody has corrected its status ' +
          'field since Jul 28.',
        sources: ['ERP', 'MES'],
        note: null,
      },
      { role: 'user', text: 'Create a task to correct R-1842’s ERP status and assign it to the ERP owner.' },
      {
        role: 'sorno',
        text: 'Done. A task to correct R-1842’s status field is assigned to the ERP owner.',
        sources: ['ERP'],
        note: null,
      },
    ],
  },
  {
    thread: [
      { role: 'user', text: 'How often have we seen bore scoring on this product family, and what was the usual repair?' },
      {
        role: 'sorno',
        text:
          'Bore scoring has been recorded on 11 HPX-400 units in the last 12 months, 9 of them ' +
          'from the same customer. Eight were repaired by sleeving; two were scrapped.',
        sources: ['Inspection', 'QMS'],
        note:
          'Confidence is limited — failure modes were only recorded as structured data from ' +
          'March onward. Earlier records are free text and may be undercounted.',
      },
      { role: 'user', text: 'Is that worth flagging to engineering as a design issue?' },
      {
        role: 'sorno',
        text:
          'Worth a look — nine of the eleven cases share a customer, which points at duty ' +
          'cycle or install practice more than a random defect. Engineering has not opened a ' +
          'review yet.',
        sources: ['Inspection', 'QMS'],
        note: null,
      },
      { role: 'user', text: 'Open an engineering review with the 11 affected units and their inspection evidence.' },
      {
        role: 'sorno',
        text: 'Review opened, with all 11 affected units and their inspection evidence attached.',
        sources: ['Inspection', 'QMS'],
        note: null,
        attachment: { name: 'HPX-400_bore-scoring-review.pdf', meta: 'PDF · 11 units · inspection evidence' },
      },
    ],
  },
  {
    thread: [
      { role: 'user', text: 'Create a parts-expedite request for the units at risk this week.' },
      {
        role: 'sorno',
        text:
          'I’ve prepared an expedite request for bearing assembly P/N 5502-D and seal kit P/N ' +
          '4471-B. It covers SO-20784, SO-20791, and SO-20802, names their promise dates, and ' +
          'routes the request to Purchasing for review before it is sent to the suppliers.',
        sources: ['ERP', 'Inventory'],
        note: 'Draft prepared — Purchasing approval is required before any supplier communication is sent.',
        attachment: { name: 'Parts-expedite-request_SO-20784-91-802.pdf', meta: 'PDF · draft · pending approval' },
      },
    ],
  },
]

/** Lifecycle view. */
export const STAGES = [
  { name: 'Intake', wip: 24, oldest: '2d', tone: 'ok' as StatusTone },
  { name: 'Inspection', wip: 18, oldest: '4d', tone: 'ok' as StatusTone },
  { name: 'Disposition', wip: 9, oldest: '6d', tone: 'warn' as StatusTone },
  { name: 'Disassembly', wip: 12, oldest: '3d', tone: 'ok' as StatusTone },
  { name: 'Repair', wip: 31, oldest: '11d', tone: 'blocked' as StatusTone, bottleneck: true },
  { name: 'Testing', wip: 7, oldest: '2d', tone: 'ok' as StatusTone },
  { name: 'Quality', wip: 5, oldest: '5d', tone: 'warn' as StatusTone },
  { name: 'Ready to ship', wip: 14, oldest: '1d', tone: 'ok' as StatusTone },
]

export const BOTTLENECK = {
  stage: 'Repair',
  headline: '31 units in repair. 15 of them are not being worked on.',
  summary:
    'Nothing here is broken equipment or missing labour. Every one of these is a ' +
    'decision or a handoff that stalled, and none of them raised a flag.',
  causes: [
    {
      count: '9',
      noun: 'units',
      title: 'Waiting on parts',
      detail: 'Parts were never reserved against the job, so nobody ordered them.',
      tone: 'blocked' as StatusTone,
    },
    {
      count: '4',
      noun: 'units',
      title: 'On quality hold',
      detail: 'Held for a disposition decision that has not been made.',
      tone: 'warn' as StatusTone,
    },
    {
      count: '2',
      noun: 'units',
      title: 'Awaiting the customer',
      detail: 'Extra work found at teardown, still unauthorised.',
      tone: 'idle' as StatusTone,
    },
  ],
}

export const ROLES = [
  {
    role: 'Plant manager',
    question: 'Which orders are at risk this week, and why?',
    body: 'One view of every unit in the building, with the blockers surfaced instead of buried.',
  },
  {
    role: 'Core manager',
    question: 'Do I have enough usable cores for next month?',
    body: 'Core receipts, grades, and availability by product family, without a spreadsheet reconciliation.',
  },
  {
    role: 'Quality manager',
    question: "What's on hold, and what's the disposition?",
    body: 'Holds, nonconformances, and test history tied to the unit and its full evidence trail.',
  },
  {
    role: 'Customer service',
    question: 'When is R-1842 shipping, and what do I tell the customer?',
    body: 'An answer with a date and a reason, without walking to the floor to ask.',
  },
]

export const INTEGRATIONS = [
  'ERP', 'MES', 'Quality systems', 'Warehouse & inventory',
  'Maintenance systems', 'Spreadsheets', 'Document repositories', 'Internal tools',
]
