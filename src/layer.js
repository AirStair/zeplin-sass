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
  return declarations.filter(declaration => {
    if (
      textStyleMatch &&
      (declaration.name === 'font-size' ||
        declaration.name === 'font-weight' ||
        declaration.name === 'font-family' ||
        declaration.name === 'letter-spacing' ||
        declaration.name === 'line-height')
    ) {
      return false
    }

    return !(declaration.hasDefaultValue && declaration.hasDefaultValue())
  })
}

let count = 0, html = ''

function joinRules(rules, layer) {
  count++
  html += '<div class="layer' + count + '">' + (typeof layer.content !== 'undefined' ? layer.content : '') + '</div>'
  html = html.replace(/\n/g, '')
  return '.layer' + count + '\n' + rules.join('\n') + '\n'
}

function declarationsToString(declarations, variableMap, textStyleMatch, layer) {
  const filteredDeclarations = filterDeclarations(declarations, textStyleMatch)
  const textStyleMixins = textStyleMatch ? ['  ${Typography.' + textStyleMatch.name + '};'] : []
  const rules = [
    ...textStyleMixins,
    ...filteredDeclarations.map(
      declaration => `  ${declaration.name}: ${declaration.getValue({ densityDivisor: 1 }, variableMap)};`
    )
  ]

  return joinRules(rules, layer).replace(/;/g, '')
}

export default function layer(context, selectedLayer) {
    let code = ''
    const setCode = (currentLayer, custom = '') => {
        const Layer_ = new Layer(currentLayer)
        const layerRuleSet = Layer_.style
        const { defaultTextStyle } = currentLayer
        const isText = currentLayer.type === 'text' && defaultTextStyle
        const textStyleMatch = isText ? context.project.findTextStyleEqual(defaultTextStyle) : undefined

        if (isText) {
            const declarations = Layer_.getLayerTextStyleDeclarations(defaultTextStyle)
            declarations.forEach(declaration => layerRuleSet.addDeclaration(declaration))
        }

        const variableMap = getVariableMap(context.project.colors)
        code += declarationsToString(layerRuleSet.declarations, variableMap, textStyleMatch, selectedLayer) + custom + '\n'
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
            topPositions = topPositions.filter((value, index, array_) => array_.indexOf(value) === index)
            leftPositions = leftPositions.filter((value, index, array_) => array_.indexOf(value) === index)
            currentLayer.layers.forEach((layer, index) => {
                setCode(layer, getPosition(layer, index))
            })
        }
    }
    setCode(selectedLayer, '  display: grid\n')
    fillLayer(selectedLayer)

    const camelCaseToWords = (camelCase) => camelCase
        .replace(/([A-Z])/g, (match) => ` ${match}`)
        .replace(/^./, (match) => match.toUpperCase())
        .trim()

    code = camelCaseToWords(code)
    const html_ = html
    html = ''
    code = '/*' + html_ + '*/\n' + code

    return {
        code,
        language: 'sass'
    }
}
