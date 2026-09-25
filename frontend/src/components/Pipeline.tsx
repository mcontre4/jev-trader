import { SectionHeader } from './primitives/SectionHeader'
import { StatusPill } from './primitives/StatusPill'
import { useInView } from '../hooks/useInView'
import { STAGES, BOTTLENECK } from '../data/demo'
import { DEMO_DISCLAIMER } from '../data/site'
import '../styles/sections/pipeline.css'

const PEAK_WIP = Math.max(...STAGES.map((s) => s.wip))

export function Pipeline() {
  const { ref, inView } = useInView<HTMLElement>()

  return (
    <section className={`section pipeline reveal${inView ? ' in' : ''}`} ref={ref}>
      <div className="shell">
        <SectionHeader
          kicker="LIFECYCLE VISIBILITY"
          title="See what’s blocking work across your operation."
          lead="See every unit by lifecycle stage, identify aging queues, and understand why work is stalled."
        />

        {/* Framed as a Sorno screen, matching the windows in the problem section, so
            this reads as something the product shows you rather than a diagram. */}
        <div className="pipeline-window">
          <div className="pipeline-chrome">
            <span className="pipeline-chrome-title pipeline-sorno-title">Sorno</span>
            <span className="pipeline-chrome-view mono">
              Plant overview · work in progress
            </span>
            <StatusPill tone="blocked" label="1 bottleneck" />
          </div>

          <div className="pipeline-body">
            {/* A flow, not a grid: the stages stay in lifecycle order on one line and
                scroll inside their own track, and queue depth is drawn as a bar so the
                bottleneck is visible rather than something to work out from 8 numbers. */}
            <div className="pipeline-flow" role="img" aria-labelledby="pipeline-summary">
              <p className="visually-hidden" id="pipeline-summary">
                Work in progress by lifecycle stage.{' '}
                {STAGES.map((s) => `${s.name}: ${s.wip} units, oldest ${s.oldest}`).join(
                  '. ',
                )}
                . The bottleneck is {BOTTLENECK.stage}.
              </p>

              {STAGES.map((stage, i) => (
                <div
                  key={stage.name}
                  className={`stage stage-${stage.tone}${
                    stage.bottleneck ? ' stage-peak' : ''
                  }`}
                >
                  <span className="stage-step mono">{String(i + 1).padStart(2, '0')}</span>

                  <div className="stage-plot">
                    <span className="stage-wip tnum">{stage.wip}</span>
                    {/* The bar needs its own track: as a flex sibling of the number
                        its percentage height got shrunk non-proportionally, which
                        made 24 render nearly as tall as 31. */}
                    <div className="stage-track">
                      <div
                        className="stage-bar"
                        style={{ height: `${Math.round((stage.wip / PEAK_WIP) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <p className="stage-name">{stage.name}</p>
                  <p className="stage-age mono">{stage.oldest}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bottleneck">
            <div className="bottleneck-head">
              <span className="bottleneck-tag mono">BOTTLENECK</span>
              <h3>{BOTTLENECK.headline}</h3>
              <p className="lead">{BOTTLENECK.summary}</p>
            </div>

            <div className="bottleneck-causes">
              {BOTTLENECK.causes.map((cause) => (
                <div className={`cause cause-${cause.tone}`} key={cause.title}>
                  <p className="cause-count tnum">
                    {cause.count}
                    <span>{cause.noun}</span>
                  </p>
                  <p className="cause-title">{cause.title}</p>
                  <p className="cause-detail">{cause.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pipeline-statusbar">
            <span className="mono">Live · updated 2 min ago</span>
            <span className="micro">{DEMO_DISCLAIMER}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
