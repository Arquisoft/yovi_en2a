import { describe, test, expect } from 'vitest'
import { RankingElementTime } from '../components/topRightMenu/ranking/rankingElements/RankingElementTime'

describe('RankingElementTime Class', () => {
  test('should initialize with correct properties and default metricName', () => {
    const element = new RankingElementTime(1, 'PlayerOne', '02:45')
    
    expect(element.position).toBe(1)
    expect(element.player1Name).toBe('PlayerOne')
    expect(element.metric).toBe('02:45')
    expect(element.metricName).toBe('TIME') // Verificamos el valor por defecto
  })
})