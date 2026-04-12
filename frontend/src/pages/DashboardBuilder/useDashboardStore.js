import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_CONFIGS = {
  ValueCard: {
    title: 'Value Card',
    showTitle: true,
    value: '2369',
    showUnit: true,
    unit: 'pcs',
    fontSize: 'large',
    accentColor: '#3b82f6',
    bgColor: '',
  },
  LEDIndicator: {
    label: 'Status',
    state: false,
    onColor: '#22c55e',
    offColor: '#ef4444',
    onText: 'ON',
    offText: 'OFF',
    ledSize: 'medium',
    blink: true,
    showLabel: true,
  },
  DonutChart: {
    title: 'Donut Chart',
    showTitle: true,
    value: 65,
    maxValue: 100,
    unit: '%',
    angle: 270,
    color: '#14b8a6',
    showCenterLabel: true,
    showPercentage: false,
  },
  LineChartWidget: {
    title: 'Line Chart',
    showTitle: true,
    lineColor: '#3b82f6',
    yAxisUnit: '',
    showDots: false,
    showGrid: true,
    pointCount: 30,
  },
  TextWidget: {
    text: 'Enter your text here',
    fontSize: 'medium',
    fontWeight: 'normal',
    color: '#e2e8f0',
    align: 'left',
    showBorder: false,
    italic: false,
    bgColor: '',
  },
}

let idCounter = Date.now()
const genId = () => `widget_${idCounter++}`

export const useDashboardStore = create(
  persist(
    (set) => ({
      widgets: [],
      currentPageId: null,

      addWidget: (type, x, y) =>
        set((s) => ({
          widgets: [
            ...s.widgets,
            {
              id: genId(),
              type,
              x,
              y,
              w: type === 'LineChartWidget' ? 4 : type === 'DonutChart' ? 2 : type === 'TextWidget' ? 3 : 2,
              h: type === 'LineChartWidget' ? 3 : type === 'DonutChart' ? 3 : type === 'TextWidget' ? 1 : 2,
              config: { ...DEFAULT_CONFIGS[type] },
            },
          ],
        })),

      moveWidget: (id, x, y) =>
        set((s) => ({
          widgets: s.widgets.map((w) => (w.id === id ? { ...w, x, y } : w)),
        })),

      resizeWidget: (id, w, h) =>
        set((s) => ({
          widgets: s.widgets.map((wid) =>
            wid.id === id ? { ...wid, w: Math.max(1, w), h: Math.max(1, h) } : wid
          ),
        })),

      updateConfig: (id, patch) =>
        set((s) => ({
          widgets: s.widgets.map((w) =>
            w.id === id ? { ...w, config: { ...w.config, ...patch } } : w
          ),
        })),

      removeWidget: (id) =>
        set((s) => ({ widgets: s.widgets.filter((w) => w.id !== id) })),

      clearCanvas: () => set({ widgets: [], currentPageId: null }),

      bringToFront: (id) =>
        set((s) => {
          const widget = s.widgets.find((w) => w.id === id)
          if (!widget) return s
          return {
            widgets: [...s.widgets.filter((w) => w.id !== id), widget],
          }
        }),

      // Load a saved page's widgets into the builder for editing
      loadWidgets: (widgets, pageId) =>
        set({
          widgets: JSON.parse(JSON.stringify(widgets)),
          currentPageId: pageId ?? null,
        }),

      setCurrentPageId: (id) => set({ currentPageId: id }),
    }),
    {
      name: 'oer-dashboard-builder',
    }
  )
)

export default useDashboardStore
