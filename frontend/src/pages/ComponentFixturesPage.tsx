import type { ReactNode } from 'react'

import { CitationList } from '@/components/chat/CitationList'
import { GateStatus } from '@/components/chat/GateStatus'
import { RefusalBanner } from '@/components/chat/RefusalBanner'
import { MathText } from '@/components/math/MathText'
import { PhotoPicker } from '@/components/media/PhotoPicker'
import { PushToTalk } from '@/components/media/PushToTalk'
import {
  ACCEPTED_CITATIONS,
  ALL_GATES_PASSED,
  INSUFFICIENT_EVIDENCE_MESSAGE_FR,
  MATH_ANSWER_TEXT,
  STREAMED_REFUSALS,
  NEXT_ACTIONS_EXAMPLE,
  OUT_OF_SCOPE_GATES,
  OUT_OF_SCOPE_MESSAGE_FR,
  OVERLONG_CITATION,
  PROVIDER_FAILURE,
} from '@/fixtures/turns'

function Fixture({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} data-fixture={id} className="space-y-3">
      <h2 id={id} className="font-serif text-xl text-ink">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Dev-only gallery of the chat components with synthetic fixtures (not routed in builds). */
export function ComponentFixturesPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl space-y-10 px-6 py-12">
      <h1 className="font-serif text-3xl text-ink">Composants — fixtures</h1>

      <Fixture id="accepted" title="Réponse validée">
        <GateStatus gates={ALL_GATES_PASSED} />
        <CitationList citations={ACCEPTED_CITATIONS} chapterTitle="Les ensembles de nombres" />
      </Fixture>

      <Fixture id="validating" title="Validation en cours">
        <GateStatus gates={null} />
      </Fixture>

      <Fixture id="out-of-scope" title="Hors programme">
        <GateStatus gates={OUT_OF_SCOPE_GATES} />
        <RefusalBanner
          educationalStatus="outside_scope"
          code="OUT_OF_SCOPE_LEVEL"
          messageFr={OUT_OF_SCOPE_MESSAGE_FR}
          nextActions={NEXT_ACTIONS_EXAMPLE}
        />
        <CitationList citations={[]} />
      </Fixture>

      <Fixture id="insufficient-evidence" title="Preuve insuffisante">
        <RefusalBanner
          educationalStatus="insufficient_evidence"
          code="INSUFFICIENT_EVIDENCE"
          messageFr={INSUFFICIENT_EVIDENCE_MESSAGE_FR}
        />
      </Fixture>

      <Fixture id="provider-failure" title="Échec du fournisseur">
        <RefusalBanner
          educationalStatus="provider_unavailable"
          code={PROVIDER_FAILURE.code}
          messageFr={PROVIDER_FAILURE.messageFr}
        />
      </Fixture>

      <Fixture id="overlong" title="Extrait trop long">
        <CitationList citations={[OVERLONG_CITATION]} />
      </Fixture>

      <Fixture id="all-refusals" title="Tous les refus et échecs du flux">
        {STREAMED_REFUSALS.map((refusal) => (
          <div key={refusal.code} data-code={refusal.code}>
            <RefusalBanner
              educationalStatus={refusal.educationalStatus}
              code={refusal.code}
              messageFr={refusal.messageFr}
            />
          </div>
        ))}
      </Fixture>

      <Fixture id="math" title="Notation mathématique validée">
        <MathText text={MATH_ANSWER_TEXT} />
      </Fixture>

      <Fixture id="math-untrusted" title="Commande non autorisée">
        <MathText text={'Voir $\\href{https://example.test}{x}$'} />
      </Fixture>

      <Fixture id="math-broken" title="Expression invalide">
        <MathText text={'On a $\\frac{1}{2$ ici.'} />
      </Fixture>

      <Fixture id="math-unbalanced" title="Délimiteur non fermé">
        <MathText text={'Le prix est $5 sans fermeture.'} />
      </Fixture>

      <Fixture id="push-to-talk" title="Push-to-talk (envoi non branché)">
        <PushToTalk />
      </Fixture>

      <Fixture id="photo" title="Photo d’exercice (envoi non branché)">
        <PhotoPicker />
      </Fixture>
    </main>
  )
}
