import Layer from 'zeplin-extension-style-kit/elements/layer'
import TextStyle from 'zeplin-extension-style-kit/elements/textStyle'
import Color from 'zeplin-extension-style-kit/values/color'

function getVariableMap(projectColors) {
  return projectColors.reduce((variableMap, color) => {
    variableMap[new Color(color).valueOf()] = '${Colors.' + color.name + '}'
    return variableMap
  }, {})
}

function filterDeclarations(declarations, textStyleMatch) {
  return declarations.filter(d => {
    if (
      textStyleMatch &&
      (d.name === 'font-size' ||
        d.name === 'font-family' ||
        d.name === 'letter-spacing' ||
        d.name === 'line-height')
    ) {
      return false
    }

    return !(d.hasDefaultValue && d.hasDefaultValue())
  })
}

let count = 0

function joinRules(rules) {
  count++
  return '.layer' + count + '\n' + rules.join('\n') + '\n'
}

function declarationsToString(declarations, variableMap, textStyleMatch) {
  const filteredDeclarations = filterDeclarations(declarations, textStyleMatch)
  const textStyleMixins = textStyleMatch ? ['  ${Typography.' + textStyleMatch.name + '};'] : []
  const rules = [
    ...textStyleMixins,
    ...filteredDeclarations.map(
      d => `  ${d.name}: ${d.getValue({ densityDivisor: 1 }, variableMap)};`
    )
  ]

  return joinRules(rules).replace(/;/g, '')
}

export default function layer(context, selectedLayer) {
    let code = '';
    const setCode = (currentLayer, custom = '') => {
        const l = new Layer(currentLayer)
        const layerRuleSet = l.style
        const { defaultTextStyle } = currentLayer
        const isText = currentLayer.type === 'text' && defaultTextStyle
        const textStyleMatch = isText ? context.project.findTextStyleEqual(defaultTextStyle) : undefined

        if (isText) {
            const declarations = l.getLayerTextStyleDeclarations(defaultTextStyle)
            declarations.forEach(p => layerRuleSet.addDeclaration(p))
        }

        const variableMap = getVariableMap(context.project.colors)
        code += declarationsToString(layerRuleSet.declarations, variableMap, textStyleMatch) + custom + '\n'
    }
    const getPosition = currentLayer => `  position: absolute\n  top: ${currentLayer.rect.y}px\n  left: ${currentLayer.rect.x}px`
    const fillLayer = currentLayer => {
        if (currentLayer.layers.length) {
            currentLayer.layers.forEach(layer => {
                setCode(layer, getPosition(layer))
            })
        }
    }
    setCode(selectedLayer, getPosition(selectedLayer))
    fillLayer(selectedLayer)

    return {
        code,
        language: 'sass'
    }
}
