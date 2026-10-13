// Block renderer registry: one component per block type in an answer.
// A new block type is one new component registered here; answers reference
// it by `type`.
import CalloutBlock from './CalloutBlock.vue'
import ChartBlock from './ChartBlock.vue'
import ChecklistBlock from './ChecklistBlock.vue'
import CompareBlock from './CompareBlock.vue'
import GapBlock from './GapBlock.vue'
import HeatmapBlock from './HeatmapBlock.vue'
import TableBlock from './TableBlock.vue'
import TextBlock from './TextBlock.vue'

export const BLOCK_RENDERERS = {
  text: TextBlock,
  chart: ChartBlock,
  table: TableBlock,
  heatmap: HeatmapBlock,
  compare: CompareBlock,
  callout: CalloutBlock,
  checklist: ChecklistBlock,
  gap: GapBlock,
}

