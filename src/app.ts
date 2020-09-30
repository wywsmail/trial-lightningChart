import {
    lightningChart,
    DataPatterns,
    AxisScrollStrategies,
    emptyFill,
    emptyLine,
    SeriesXYFormatter,
    LineSeries,
    SolidFill,
    AxisTickStrategies,
    SolidLine,
    ColorRGBA,
    Themes
} from "@arction/lcjs"

import { data } from './data'

// Use theme if provided
const urlParams = new URLSearchParams(window.location.search);
let theme = Themes.dark
if (urlParams.get('theme') == 'light')
    theme = Themes.light

// Define channels.
const channels = [
    'LEAD 1',
    'LEAD 2',
    'LEAD 3',
    'aVR',
    'aVL',
    'aVF'
]
// This is more like a guideline (streaming uses JS setInterval, which is not precise). Refer to in-chart PPS indicator for actual value.
const approxPointsPerSecondChannel = 10000
const channelHeight = 1.0
const channelGap = 0.2

// Create Chart.
const chart = lightningChart().ChartXY({
    theme: theme,
    container: 'chart-container'
})
    // Hide title.
    .setTitleFillStyle(emptyFill)

// Configurure Axes Scrolling modes.
const axisX = chart.getDefaultAxisX()
    // Scroll along with incoming data.
    .setScrollStrategy(AxisScrollStrategies.progressive)
    .setInterval(-approxPointsPerSecondChannel, 0)

const axisY = chart.getDefaultAxisY()
    // Keep same interval always.
    .setScrollStrategy(undefined)
    .setInterval(0, channels.length * channelHeight + (channels.length - 1) * channelGap)
    // Hide default ticks.
    .setTickStrategy(AxisTickStrategies.Empty)

// Create a LineSeries for each "channel".
const series = channels.map((ch, i) => {
    const series = chart
        .addLineSeries({
            // Specifying progressive DataPattern enables some otherwise unusable optimizations.
            dataPattern: DataPatterns.horizontalProgressive
        })
        .setName(ch)
        // Specify data to be cleaned after a buffer of approx. 10 seconds.
        // Regardless of this value, data has to be out of view to be cleaned in any case.
        .setMaxPointCount(approxPointsPerSecondChannel * 10)
    // Add Label to Y-axis that displays the Channel name.
    axisY.addCustomTick()
        .setValue((i + 0.5) * channelHeight + i * channelGap)
        .setTextFormatter(() => ch)
        .setMarker((marker) => marker
            .setFont((font) => font
                .setWeight('bold')
            )
            .setTextFillStyle(new SolidFill())
            .setBackground((background) => background
                .setFillStyle(emptyFill)
                .setStrokeStyle(emptyLine)
            )
        )
        .setGridStrokeStyle(new SolidLine({
            thickness: 3,
            fillStyle: new SolidFill({ color: ColorRGBA(255, 125, 0, 80) })
        }))
    return series
})

series.forEach((series, i) => {
    const seriesDataKey = Object.keys(data).find(key=>key.includes((i+1).toString(10)))
    const seriesData = data[seriesDataKey]
    
    for(let j = 0; j < seriesData.length; j+=1){
        seriesData[j] += i*channelHeight + i*channelGap+0.5
    }
    series.addArrayY(seriesData)
})

// Style AutoCursor.
chart.setAutoCursor((autoCursor) => autoCursor
    .setGridStrokeYStyle(emptyLine)
    .disposeTickMarkerY()
)
const resultTableFormatter: SeriesXYFormatter = (tableContentBuilder, activeSeries: LineSeries, x, y) => {
    const seriesIndex = series.indexOf(activeSeries)

    return tableContentBuilder
        .addRow(activeSeries.getName())
        .addRow('X', '', activeSeries.axisX.formatValue(x))
        // Translate Y coordinate back to [-1, 1].
        .addRow('Y', '', activeSeries.axisY.formatValue(y - (seriesIndex * channelHeight + seriesIndex * channelGap + 0.5)))
}
series.forEach((series) => series.setResultTableFormatter(resultTableFormatter))
