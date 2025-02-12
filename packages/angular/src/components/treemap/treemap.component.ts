// !!! This code was automatically generated. You should not change it !!!
import { Component, AfterViewInit, Input, SimpleChanges } from '@angular/core'
import {
  Treemap,
  TreemapConfigInterface,
  ContainerCore,
  VisEventType,
  VisEventCallback,
  NumericAccessor,
  StringAccessor,
  ColorAccessor,
  TreemapNode,
} from '@unovis/ts'
import { VisCoreComponent } from '../../core'

@Component({
  selector: 'vis-treemap',
  template: '',
  // eslint-disable-next-line no-use-before-define
  providers: [{ provide: VisCoreComponent, useExisting: VisTreemapComponent }],
})
export class VisTreemapComponent<Datum> implements TreemapConfigInterface<Datum>, AfterViewInit {
  /** Animation duration of the data update transitions in milliseconds. Default: `600` */
  @Input() duration?: number

  /** Events configuration. An object containing properties in the following format:
   *
   * ```
   * {
   * \[selectorString]: {
   *     \[eventType]: callbackFunction
   *  }
   * }
   * ```
   * e.g.:
   * ```
   * {
   * \[Area.selectors.area]: {
   *    click: (d) => console.log("Clicked Area", d)
   *  }
   * }
   * ``` */
  @Input() events?: {
    [selector: string]: {
      [eventType in VisEventType]?: VisEventCallback
    };
  }

  /** You can set every SVG and HTML visualization object to have a custom DOM attributes, which is useful
   * when you want to do unit or end-to-end testing. Attributes configuration object has the following structure:
   *
   * ```
   * {
   * \[selectorString]: {
   *     \[attributeName]: attribute constant value or accessor function
   *  }
   * }
   * ```
   * e.g.:
   * ```
   * {
   * \[Area.selectors.area]: {
   *    "test-value": d => d.value
   *  }
   * }
   * ``` */
  @Input() attributes?: {
    [selector: string]: {
      [attr: string]: string | number | boolean | ((datum: any) => string | number | boolean);
    };
  }


  @Input() id?: ((d: Datum, i: number) => string | number)


  @Input() value?: NumericAccessor<Datum>

  /** Array of accessor functions to defined the nested groups. Default: `[]` */
  @Input() layers: StringAccessor<Datum>[]

  /** A function that accepts a value number and returns a string. Default: `undefined` */
  @Input() numberFormat?: (value: number) => string

  /** Color accessor function for tiles. Default: `undefined` */
  @Input() tileColor?: ColorAccessor<TreemapNode<Datum>>

  /** Padding passed to D3 treemap layout. Default: `2` */
  @Input() tilePadding?: number

  /** Top padding passed to D3 treemap layout.
   * Useful to make room for internal node labels.
   * Default: `undefined` */
  @Input() tilePaddingTop?: number

  /** Label internal nodes. Default: `false` */
  @Input() labelInternalNodes?: boolean

  /** Label offset in the X direction. Default: `4` */
  @Input() labelOffsetX?: number

  /** Label offset in the Y direction. Default: `4` */
  @Input() labelOffsetY?: number

  /** Border radius of the tiles in pixels. Default: `2` */
  @Input() tileBorderRadius?: number

  /** Enable lightness variance for sibling tiles. Default: `false` */
  @Input() enableLightnessVariance?: boolean

  /** Enable font size variation for leaf node labels based on value. Default: `false` */
  @Input() enableTileLabelFontSizeVariation?: boolean

  /** Minimum font size in pixels for leaf node labels when font size variation is enabled. Default: `8` */
  @Input() tileLabelMinFontSize?: number

  /** Maximum font size in pixels for leaf node labels when font size variation is enabled. Default: `32` */
  @Input() tileLabelMaxFontSize?: number
  @Input() data: Datum[]

  component: Treemap<Datum> | undefined
  public componentContainer: ContainerCore | undefined

  ngAfterViewInit (): void {
    this.component = new Treemap<Datum>(this.getConfig())

    if (this.data) {
      this.component.setData(this.data)
      this.componentContainer?.render()
    }
  }

  ngOnChanges (changes: SimpleChanges): void {
    if (changes.data) { this.component?.setData(this.data) }
    this.component?.setConfig(this.getConfig())
    this.componentContainer?.render()
  }

  private getConfig (): TreemapConfigInterface<Datum> {
    const { duration, events, attributes, id, value, layers, numberFormat, tileColor, tilePadding, tilePaddingTop, labelInternalNodes, labelOffsetX, labelOffsetY, tileBorderRadius, enableLightnessVariance, enableTileLabelFontSizeVariation, tileLabelMinFontSize, tileLabelMaxFontSize } = this
    const config = { duration, events, attributes, id, value, layers, numberFormat, tileColor, tilePadding, tilePaddingTop, labelInternalNodes, labelOffsetX, labelOffsetY, tileBorderRadius, enableLightnessVariance, enableTileLabelFontSizeVariation, tileLabelMinFontSize, tileLabelMaxFontSize }
    const keys = Object.keys(config) as (keyof TreemapConfigInterface<Datum>)[]
    keys.forEach(key => { if (config[key] === undefined) delete config[key] })

    return config
  }
}
