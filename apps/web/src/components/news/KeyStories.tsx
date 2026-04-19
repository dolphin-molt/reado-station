import type { KeyStory } from '@/lib/content'
import { t, type Lang } from '@/lib/i18n'

export function KeyStories({ lang, stories }: { lang: Lang; stories: KeyStory[] }) {
  if (stories.length === 0) return null

  return (
    <section className="key-stories">
      <div className="container">
        <h2 className="key-stories__title">{t(lang, 'keyStories.title')}</h2>
        <ol className="key-stories__list">
          {stories.map((story, index) => (
            <li className="key-stories__item" key={`${story.title}-${index}`}>
              <span className="key-stories__num">{String(index + 1).padStart(2, '0')}</span>
              <div className="key-stories__content">
                <h3 className="key-stories__headline">
                  {story.sources[0]?.url ? (
                    <a href={story.sources[0].url} target="_blank" rel="noreferrer">
                      {story.title}
                    </a>
                  ) : (
                    story.title
                  )}
                </h3>
                {(story.impact || story.summary) && (
                  <p className="key-stories__impact">{story.impact || story.summary}</p>
                )}
                <div className="key-stories__meta">
                  <span className="key-stories__cluster">{story.cluster}</span>
                  {story.sources.slice(0, 4).map((source) => (
                    <a
                      className="key-stories__source"
                      href={source.url}
                      key={`${story.title}-${source.url}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.name}
                    </a>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
