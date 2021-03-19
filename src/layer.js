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

    let topPositions = [], leftPositions = []
    const isInteger = number_ => (number_ ^ 0) === number_
    const fillPositions = currentLayer => {
        topPositions.push(isInteger(currentLayer.rect.y) ? currentLayer.rect.y : Math.trunc(currentLayer.rect.y) - 1)
        leftPositions.push(isInteger(currentLayer.rect.x) ? currentLayer.rect.x : Math.trunc(currentLayer.rect.x) - 1)
    }

    const getPosition = (currentLayer, index) => {
        const gridRow = topPositions.findIndex(value => value === currentLayer.rect.y) + 1;
        const gridColumn = leftPositions.findIndex(value => value === currentLayer.rect.x) + 1;
        return `  grid-row: ${gridRow} / ${gridRow}\n  grid-column: ${gridColumn} / ${gridColumn}\n`
    }
    const fillLayer = currentLayer => {
        if (currentLayer.layers.length) {
            currentLayer.layers.forEach(layer => {
                fillPositions(layer)
            })
            topPositions = topPositions.filter((v, i, a) => a.indexOf(v) === i)
            leftPositions = leftPositions.filter((v, i, a) => a.indexOf(v) === i)
            currentLayer.layers.forEach((layer, index) => {
                setCode(layer, getPosition(layer, index))
            })
        }
    }
    setCode(selectedLayer, '  display: grid\n')
    fillLayer(selectedLayer)

    return {
        code,
        language: 'sass'
    }
}
