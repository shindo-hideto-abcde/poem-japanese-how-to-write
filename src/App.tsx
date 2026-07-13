import { useEffect, useMemo, useState } from 'react'

type Stage = 'welcome' | 'theme' | 'questions' | 'candidates' | 'edit' | 'complete'
type AnswerKey = 'memory' | 'place' | 'appearance' | 'movement' | 'sound' | 'onomatopoeia' | 'feeling' | 'comparison' | 'repeat' | 'ending'
type Answers = Record<AnswerKey, string>
type Candidate = { id: string; name: string; description: string; lines: string[]; elements: string[] }
type Draft = { stage: Stage; theme: string; answers: Answers; questionIndex: number; candidates: Candidate[]; selectedId: string | null; editedLines: string[]; title: string; createdAt: string }

const STORAGE_KEY = 'kotoba-no-niwa-draft-v1'
const themes = ['休み時間', '季節', '家族', '生き物', '好きな物', '自由']
const emptyAnswers = (): Answers => ({ memory: '', place: '', appearance: '', movement: '', sound: '', onomatopoeia: '', feeling: '', comparison: '', repeat: '', ending: '' })
const newDraft = (): Draft => ({ stage: 'welcome', theme: '', answers: emptyAnswers(), questionIndex: 0, candidates: [], selectedId: null, editedLines: [], title: '', createdAt: new Date().toISOString() })

const questions: { key: AnswerKey; prompt: string; hint: string; optional?: boolean }[] = [
  { key: 'memory', prompt: 'そのとき、いちばん心にのこったものは何？', hint: '例：校庭の大きな水たまり、ゆれるひまわり' },
  { key: 'place', prompt: 'どこで、いつ見つけた（あった）こと？', hint: '例：雨あがりの校庭で、帰り道に' },
  { key: 'appearance', prompt: 'どんな色・形・大きさだった？', hint: '例：金色で、まるくて、手のひらくらい' },
  { key: 'movement', prompt: 'どんな動きをしていた？ 何をしていた？', hint: '例：風にゆらゆらゆれていた' },
  { key: 'sound', prompt: 'どんな音がした？ 音がしなければ、どんな静けさだった？', hint: '例：ぴちゃぴちゃ、だれもいないしずけさ' },
  { key: 'onomatopoeia', prompt: 'その音やようすを、くり返すことばで言うと？', hint: '例：ふわふわ、きらきら、しんしん' },
  { key: 'feeling', prompt: 'そのとき、体や心はどんな感じ？', hint: '例：胸がどきどきした、なんだかうれしい' },
  { key: 'comparison', prompt: 'それは何に見えた？ 「○○みたい」でたとえてみよう。', hint: '例：空にうかぶ白い船みたい', optional: true },
  { key: 'repeat', prompt: 'もう一度言いたい、好きなことばはどれ？', hint: '例：きらきら、走れ走れ', optional: true },
  { key: 'ending', prompt: 'さいごに、読んだ人の心にのこしたい気持ちや場面は？', hint: '例：明日も見つけられるかな', optional: true },
]

const useful = (value: string) => value.trim()
const optionalLines = (values: string[]) => values.map(useful).filter(Boolean)
function createCandidate(id: string, name: string, description: string, raw: string[], elements: string[]): Candidate {
  const lines = optionalLines(raw)
  const filler = ['そのとき', 'わたしは見ていた', 'ことばにしてみる', 'そっと心にしまった']
  while (lines.length < 8) lines.splice(Math.max(1, lines.length - 1), 0, filler[lines.length % filler.length])
  return { id, name, description, lines: lines.slice(0, 12), elements }
}
function makeCandidates(a: Answers): Candidate[] {
  const rep = useful(a.repeat)
  const ono = useful(a.onomatopoeia)
  const comparison = useful(a.comparison)
  return [
    createCandidate('scene', 'ようすが見える詩', '色や動きをたっぷり入れた詩', [a.memory, a.place, a.appearance, a.movement, a.sound, ono, comparison, a.feeling, a.ending], ['色・形', '動き', ...(ono ? ['オノマトペ'] : []), ...(comparison ? ['たとえ'] : [])]),
    createCandidate('sound', '音がひびく詩', '音とくり返しでリズムをつくる詩', [ono, a.memory, a.sound, rep, a.movement, ono, a.appearance, rep, a.feeling, a.ending], ['音', ...(ono ? ['オノマトペ'] : []), ...(rep ? ['くり返し'] : [])]),
    createCandidate('feeling', '気持ちがのこる詩', '見つけたことから気持ちへ進む詩', [a.place, a.memory, a.appearance, comparison, a.movement, a.sound, a.feeling, rep, a.ending], ['気持ち', ...(comparison ? ['たとえ'] : []), ...(rep ? ['くり返し'] : [])]),
  ]
}
function safeFilename(value: string) { return (value || 'わたしの詩').replace(/[\\/:*?"<>|]/g, '_') }
function formatDate(iso: string) { return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso)) }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]!)) }

export default function App() {
  const [resumeDraft, setResumeDraft] = useState<Draft | null>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as Draft
      return saved.stage !== 'welcome' ? saved : null
    } catch { return null }
  })
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as Draft
      return saved.stage !== 'welcome' ? { ...saved, stage: 'welcome' } : saved
    } catch { return newDraft() }
  })
  const [voiceStatus, setVoiceStatus] = useState('')
  const [customTheme, setCustomTheme] = useState('')
  useEffect(() => { if (!(resumeDraft && draft.stage === 'welcome')) localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)) }, [draft, resumeDraft])
  const question = questions[draft.questionIndex]
  const memo = useMemo(() => questions.filter(({ key }) => useful(draft.answers[key])).map(({ key, prompt }) => ({ key, prompt, value: draft.answers[key] })), [draft.answers])
  const update = (partial: Partial<Draft>) => setDraft((current) => ({ ...current, ...partial }))
  const reset = () => { localStorage.removeItem(STORAGE_KEY); setResumeDraft(null); setDraft(newDraft()); setCustomTheme('') }
  const speak = () => {
    if (!('speechSynthesis' in window)) { setVoiceStatus('この端末では読み上げを使えません。声に出して読んでみよう。'); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance([draft.title, ...draft.editedLines].filter(Boolean).join('。\n'))
    utterance.lang = 'ja-JP'; window.speechSynthesis.speak(utterance); setVoiceStatus('読み上げ中です。聞きながら、ことばを直しても大丈夫。')
  }
  const startVoice = () => {
    const Recognition = (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition
    if (!Recognition) { setVoiceStatus('このブラウザでは音声入力を使えません。キーボードで入力しよう。'); return }
    const recognition = new Recognition(); recognition.lang = 'ja-JP'; recognition.interimResults = false; recognition.maxAlternatives = 1
    recognition.onstart = () => setVoiceStatus('話してみよう。終わると文字になります。')
    recognition.onresult = (event: any) => { const text = event.results[0][0].transcript; update({ answers: { ...draft.answers, [question.key]: `${draft.answers[question.key]}${draft.answers[question.key] ? ' ' : ''}${text}` } }); setVoiceStatus('文字になりました。直しても大丈夫。') }
    recognition.onerror = () => setVoiceStatus('うまく聞き取れませんでした。キーボードで入力しよう。')
    recognition.start()
  }
  const exportText = () => {
    const content = `${draft.title || 'わたしの詩'}\n\n${draft.editedLines.join('\n')}\n\n作成日：${formatDate(draft.createdAt)}\n`
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `${safeFilename(draft.title)}.txt`; link.click(); URL.revokeObjectURL(url)
  }
  const printPoem = () => {
    const popup = window.open('', '_blank', 'noopener,noreferrer')
    if (!popup) { setVoiceStatus('印刷用の画面を開けませんでした。ポップアップを許可してから試してね。'); return }
    popup.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${escapeHtml(draft.title || 'わたしの詩')}</title><style>@page{size:A4 portrait;margin:24mm}body{font-family:"Hiragino Maru Gothic ProN","Yu Gothic",sans-serif;color:#25211c}h1{text-align:center;font-size:24pt;margin:0 0 26mm}.poem{font-size:16pt;line-height:2;white-space:pre-wrap}.date{margin-top:24mm;text-align:right;font-size:10pt;color:#555}</style></head><body><h1>${escapeHtml(draft.title || 'わたしの詩')}</h1><div class="poem">${draft.editedLines.map(escapeHtml).join('\n')}</div><p class="date">作成日：${formatDate(draft.createdAt)}</p><script>window.onload=()=>window.print()<\/script></body></html>`)
    popup.document.close()
  }

  if (draft.stage === 'welcome') return <main className="app"><section className="hero card"><p className="eyebrow">ことばを あつめて、詩にしよう</p><h1>ことばのにわ</h1><p>質問に答えるだけで、あなただけの詩ができるよ。</p><button className="primary" onClick={() => { setResumeDraft(null); update({ stage: 'theme' }) }}>はじめる</button>{resumeDraft && <><button className="secondary" onClick={() => { setDraft(resumeDraft); setResumeDraft(null) }}>前のつづきをひらく</button><button className="text-button" onClick={reset}>前の作品を消す</button></>}</section></main>
  if (draft.stage === 'theme') return <main className="app"><section className="card"><p className="eyebrow">1 / 12</p><h1>どんなことを詩にする？</h1><p>書きたい題材をえらぼう。</p><div className="theme-grid">{themes.map((theme) => <button key={theme} className={draft.theme === theme ? 'theme selected' : 'theme'} onClick={() => update({ theme })}>{theme}</button>)}</div>{draft.theme === '自由' && <label className="field">題材の名前<input value={customTheme} onChange={(e) => setCustomTheme(e.target.value)} placeholder="例：ぼくの赤いくつ" /></label>}<div className="actions"><button className="secondary" onClick={() => update({ stage: 'welcome' })}>もどる</button><button className="primary" disabled={!draft.theme || (draft.theme === '自由' && !customTheme.trim())} onClick={() => update({ theme: draft.theme === '自由' ? customTheme.trim() : draft.theme, stage: 'questions' })}>つぎへ</button></div></section></main>
  if (draft.stage === 'questions') return <main className="app question-layout"><section className="card question-card"><p className="eyebrow">ことば集め {draft.questionIndex + 1} / {questions.length}</p><div className="progress"><span style={{ width: `${((draft.questionIndex + 1) / questions.length) * 100}%` }} /></div><h1>{question.prompt}</h1>{question.optional && <p className="optional">思いつかなければ、空のままでも大丈夫。</p>}<label className="field"><span className="sr-only">答え</span><textarea value={draft.answers[question.key]} onChange={(e) => update({ answers: { ...draft.answers, [question.key]: e.target.value } })} placeholder={question.hint} rows={4} autoFocus /></label><p className="hint">{question.hint}</p><button className="voice" onClick={startVoice}>🎙️ 話して入力する</button>{voiceStatus && <p className="status" role="status">{voiceStatus}</p>}<div className="actions"><button className="secondary" onClick={() => draft.questionIndex === 0 ? update({ stage: 'theme' }) : update({ questionIndex: draft.questionIndex - 1 })}>もどる</button><button className="primary" onClick={() => draft.questionIndex === questions.length - 1 ? update({ candidates: makeCandidates(draft.answers), stage: 'candidates' }) : update({ questionIndex: draft.questionIndex + 1 })}>{draft.questionIndex === questions.length - 1 ? '詩の案を見る' : 'つぎへ'}</button></div></section><aside className="memo"><h2>ことばメモ</h2>{memo.length ? memo.map((item) => <div className="memo-item" key={item.key}><small>{item.prompt}</small><p>{item.value}</p></div>) : <p>答えたことばが、ここにたまるよ。</p>}</aside></main>
  if (draft.stage === 'candidates') return <main className="app"><section className="card wide"><p className="eyebrow">ことばが詩になったよ</p><h1>好きな詩の形をえらぼう</h1><p>どの案も、あなたが集めたことばからできています。</p><div className="candidates">{draft.candidates.map((candidate) => <article className="candidate" key={candidate.id}><h2>{candidate.name}</h2><p className="candidate-description">{candidate.description}</p><p className="tags">{candidate.elements.map((e) => <span key={e}>{e}</span>)}</p><div className="preview">{candidate.lines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div><button className="primary" onClick={() => update({ selectedId: candidate.id, editedLines: candidate.lines, stage: 'edit' })}>この案にする</button></article>)}</div><button className="secondary" onClick={() => update({ stage: 'questions', questionIndex: questions.length - 1 })}>ことばを直す</button></section></main>
  if (draft.stage === 'edit') return <main className="app"><section className="card wide"><p className="eyebrow">声に出して、仕上げよう</p><h1>一行ずつ、あなたの詩にする</h1><label className="field title-field">題名<input value={draft.title} onChange={(e) => update({ title: e.target.value })} placeholder="題名をつけよう" /></label><div className="line-editor">{draft.editedLines.map((line, index) => <label key={index}><span>{index + 1}</span><input value={line} onChange={(e) => { const next = [...draft.editedLines]; next[index] = e.target.value; update({ editedLines: next }) }} /></label>)}</div><button className="voice" onClick={speak}>🔊 音読してみよう</button>{voiceStatus && <p className="status" role="status">{voiceStatus}</p>}<div className="checklist"><strong>聞きながら たしかめよう</strong><p>□ 好きなことばが、くり返されている？　□ 音やようすが見えてくる？　□ さいごに気持ちがのこる？</p></div><div className="actions"><button className="secondary" onClick={() => update({ stage: 'candidates' })}>案をえらび直す</button><button className="primary" onClick={() => update({ stage: 'complete' })}>完成！</button></div></section></main>
  return <main className="app"><section className="card complete"><p className="eyebrow">できあがり！</p><h1>{draft.title || 'わたしの詩'}</h1><div className="final-poem">{draft.editedLines.map((line, index) => <p key={index}>{line}</p>)}</div><p className="date">作成日：{formatDate(draft.createdAt)}</p><div className="export-actions"><button className="primary" onClick={printPoem}>🖨️ PDFにして保存</button><button className="secondary" onClick={exportText}>↓ テキストで保存</button></div>{voiceStatus && <p className="status" role="status">{voiceStatus}</p>}<div className="actions"><button className="secondary" onClick={() => update({ stage: 'edit' })}>詩を直す</button><button className="text-button" onClick={reset}>新しい詩をつくる</button></div></section></main>
}
