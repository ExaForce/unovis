import { NgModule } from '@angular/core'
import { VisXYContainerModule, VisAxisModule, VisScatterModule, VisTooltipModule } from '@unovis/angular'

import { BeeswarmScatterPlotComponent } from './beeswarm-scatter-plot.component'

@NgModule({
  imports: [VisXYContainerModule, VisScatterModule, VisAxisModule, VisTooltipModule],
  declarations: [BeeswarmScatterPlotComponent],
  exports: [BeeswarmScatterPlotComponent],
})
export class BeeswarmScatterPlotModule { }
