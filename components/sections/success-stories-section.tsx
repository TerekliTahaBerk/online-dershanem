"use client";

import { useMemo, useState } from "react";
import { successStories, successStoryTracks } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";

type StoryTrack = (typeof successStoryTracks)[number];

export function SuccessStoriesSection() {
  const [activeTrack, setActiveTrack] = useState<StoryTrack>("LGS");

  const stories = useMemo(() => successStories.filter((item) => item.track === activeTrack), [activeTrack]);

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <FadeIn>
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Sınav Türüne Göre Başarı Hikayeleri</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Kısa yorumlardan çok, öğrencinin süreçte gerçekten neler yaşadığını anlatan hikayelere yer veriyoruz. Böylece hangi adımın
            işe yaradığını ve gelişimin nasıl geldiğini daha net görebilirsin.
          </p>
        </FadeIn>

        <div className="mt-6 flex flex-wrap gap-2">
          {successStoryTracks.map((track) => (
            <button
              key={track}
              onClick={() => setActiveTrack(track)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                activeTrack === track ? "bg-anchor text-white" : "border border-line-strong bg-white text-ink hover:bg-soft"
              }`}
            >
              {track}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {stories.map((story, i) => (
            <FadeIn key={story.title} delay={i * 0.08}>
              <article className="h-full rounded-3xl border border-line bg-white p-6 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">{story.track} Süreci</p>
                <h3 className="mt-2 text-xl font-semibold text-ink">{story.title}</h3>
                <p className="mt-1 text-xs font-medium text-muted/70">{story.student}</p>
                <p className="mt-2 inline-flex rounded-full bg-soft px-3 py-1 text-xs font-semibold text-ink">{story.result}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted">{story.story}</p>
                <ul className="mt-4 space-y-2 text-xs leading-relaxed text-muted">
                  {story.keyMoves.map((move) => (
                    <li key={move}>• {move}</li>
                  ))}
                </ul>
              </article>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
