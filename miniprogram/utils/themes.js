// utils/themes.js 主题皮肤定义
// 每款皮肤提供 light / dark 两套品牌色族，配合 app.wxss 的 .skin-* 变量块生效
const SKINS = [
  {
    key: 'emerald',
    label: '翡翠绿',
    light: {
      brand: '#10b981', brandLight: '#34d399', brandLightest: '#d1fae5',
      brandDark: '#059669', brandDarker: '#047857',
      tint: 'rgba(16, 185, 129, 0.10)', tintStrong: 'rgba(16, 185, 129, 0.16)'
    },
    dark: {
      brand: '#34d399', brandLight: '#6ee7b7', brandLightest: '#064e3b',
      brandDark: '#34d399', brandDarker: '#6ee7b7',
      tint: 'rgba(52, 211, 153, 0.14)', tintStrong: 'rgba(52, 211, 153, 0.20)'
    }
  },
  {
    key: 'ocean',
    label: '海洋蓝',
    light: {
      brand: '#3b82f6', brandLight: '#60a5fa', brandLightest: '#dbeafe',
      brandDark: '#2563eb', brandDarker: '#1d4ed8',
      tint: 'rgba(59, 130, 246, 0.10)', tintStrong: 'rgba(59, 130, 246, 0.16)'
    },
    dark: {
      brand: '#60a5fa', brandLight: '#93c5fd', brandLightest: '#1e3a8a',
      brandDark: '#60a5fa', brandDarker: '#93c5fd',
      tint: 'rgba(96, 165, 250, 0.14)', tintStrong: 'rgba(96, 165, 250, 0.20)'
    }
  },
  {
    key: 'sunset',
    label: '落日橙',
    light: {
      brand: '#f97316', brandLight: '#fb923c', brandLightest: '#ffedd5',
      brandDark: '#ea580c', brandDarker: '#c2410c',
      tint: 'rgba(249, 115, 22, 0.10)', tintStrong: 'rgba(249, 115, 22, 0.16)'
    },
    dark: {
      brand: '#fb923c', brandLight: '#fdba74', brandLightest: '#7c2d12',
      brandDark: '#fb923c', brandDarker: '#fdba74',
      tint: 'rgba(251, 146, 60, 0.14)', tintStrong: 'rgba(251, 146, 60, 0.20)'
    }
  }
]

const DEFAULT_SKIN = 'emerald'

function getSkin(key) {
  return SKINS.find(s => s.key === key) || SKINS[0]
}

function getSkinList() {
  return SKINS.map(s => ({ key: s.key, label: s.label }))
}

module.exports = {
  SKINS,
  DEFAULT_SKIN,
  getSkin,
  getSkinList
}
