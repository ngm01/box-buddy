import wordLists from '../assets/word-lists.js'
export function getRandomName() {
  const { adjectives1, adjectives2, nouns } = wordLists
  const randomAdjective1 = adjectives1[Math.floor(Math.random() * adjectives1.length)]
  const randomAdjective2 = adjectives2[Math.floor(Math.random() * adjectives2.length)]
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
  let randomName = `${randomAdjective1}-${randomAdjective2}-${randomNoun}`
  console.log('randomName', randomName)
  return randomName
}
