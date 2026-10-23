import React from 'react'
import { Scale } from '@unovis/ts'
import { VisXYContainer, VisArea, VisLine, VisStackedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/react'

import { randomNumberGenerator } from '@src/utils/data'
import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'

export const title = 'Price and Volume'
export const subTitle = 'Scales mapped onto segments of the chart'

type Candle = {
  date: number;
  open: number;
  close: number;
  volume: number;
}

const day = 24 * 60 * 60 * 1000
const start = Date.UTC(2026, 3, 1)
let price = 2000
const data: Candle[] = Array(180).fill(0).map((_, i) => {
  const open = price
  const change = (randomNumberGenerator() - 0.48) * 90
  const close = Math.max(1200, open + change)
  price = close
  return {
    date: start + i * day,
    open,
    close,
    volume: 6000 + 8000 * randomNumberGenerator() + Math.abs(change) * 120,
  }
})

// The area stacks its values on top of the baseline, so to fill from the lowest price (rather than
// from zero, which would inflate the price domain) it gets the distance above that price as its value
const priceMin = Math.min(...data.map(d => d.close))

const colors = { price: '#4D8CFD', up: '#2BB2A1', down: '#FF6B7E' }
const formatDate = (t: number | Date): string => new Date(t).toUTCString().slice(5, 11)
const formatPrice = (p: number | Date): string => `$${(+p).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  return (
    <VisXYContainer<Candle>
      data={data}
      height={500}
      xScale={Scale.scaleTime()}
      yRangeSegment={[0.25, 1]}
      yScales={{ volume: { rangeSegment: [0, 0.18], domain: [0, undefined] } }}
    >
      {/* The price on the primary Y scale, taking the top three quarters of the chart */}
      <VisArea<Candle> x={d => d.date} y={d => d.close - priceMin} baseline={() => priceMin} color={colors.price} opacity={0.15} excludeFromCrosshair duration={props.duration}/>
      <VisLine<Candle> x={d => d.date} y={d => d.close} color={colors.price} lineWidth={1.5} duration={props.duration}/>

      {/* The volume on a scale of its own, mapped onto the bottom of the chart, with no axis shown for it */}
      <VisStackedBar
        x={d => d.date}
        y={d => d.volume}
        yScaleKey='volume'
        color={(d: Candle) => d.close >= d.open ? colors.up : colors.down}
        barPadding={0.4}
        excludeFromCrosshair
        duration={props.duration}
      />

      <VisAxis type='y' position='right' label='Price' tickFormat={formatPrice} numTicks={6} duration={props.duration}/>
      <VisAxis type='x' tickFormat={formatDate} gridLine={false} duration={props.duration}/>

      <VisCrosshair
        template={(d: Candle) => `${formatDate(d.date)}: ${formatPrice(d.close)}, volume ${(d.volume / 1000).toFixed(1)}K`}
        color={colors.price}
      />
      <VisTooltip/>
    </VisXYContainer>
  )
}
