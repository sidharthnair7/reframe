package fileidea.reframe.pipeline;

import java.util.List;

public final class FrameworkCorpus {

    public record Framework(String name, String text) {}

    public static final List<Framework> DOCUMENTS = List.of(
        new Framework("GTD (Getting Things Done) — Capture & Clarify", """
            Framework: GTD (Getting Things Done) — Capture & Clarify
            Core idea: Don't try to do the task yet. First capture every sub-step
            without judgment, then identify the single next physical action.
            Momentum comes from clarity, not motivation. Best for multi-step
            actionable tasks that feel overwhelming because of their size.
            """),
        new Framework("Eat the Frog", """
            Framework: Eat the Frog
            Core idea: Identify the single most important or most-avoided task
            and do it first, before anything else, while willpower is freshest.
            Avoidance compounds — the longer an unpleasant task is delayed, the
            heavier it feels. Best for actionable tasks being procrastinated
            specifically because they're unpleasant, not because they're unclear.
            """),
        new Framework("Time-Blocking", """
            Framework: Time-Blocking
            Core idea: An open-ended to-do item competes with everything else for
            attention and usually loses. Assign the task a specific block on the
            calendar with a start and end time, treating it like an appointment
            you can't skip. Best for actionable tasks that keep getting pushed
            aside by more urgent-feeling but less important demands.
            """),
        new Framework("Two-Minute Rule", """
            Framework: Two-Minute Rule
            Core idea: If a task would take less than two minutes to complete,
            do it immediately instead of writing it down or scheduling it — the
            overhead of tracking it exceeds the cost of just finishing it. Best
            for small actionable tasks that are cluttering a list more than they
            deserve to.
            """),
        new Framework("CBT Cognitive Defusion", """
            Framework: CBT Cognitive Defusion
            Core idea: Separate the fear from the fact. Ask: what is the worst
            realistic outcome, and what is one small action that reduces it by
            10%? Anxiety shrinks when met with a concrete next step, not
            avoidance. Best for anxiety rooted in catastrophic or worst-case
            thinking about a specific outcome.
            """),
        new Framework("Self-Compassion Reframing", """
            Framework: Self-Compassion Reframing
            Core idea: Notice the harsh inner voice and ask what you'd say to a
            close friend in the exact same situation — then say that to
            yourself instead. Self-judgment increases paralysis; self-compassion
            restores the capacity to act. Best for anxiety rooted in shame,
            self-blame, or feeling like falling behind means something is wrong
            with you personally.
            """),
        new Framework("Worry Time Scheduling", """
            Framework: Worry Time Scheduling
            Core idea: Set aside one specific 15-minute window each day that is
            allowed to be spent worrying about the issue. Outside that window,
            note the worry down and defer it to the scheduled time. This
            contains rumination instead of letting it bleed into the rest of the
            day. Best for anxiety that shows up as recurring, looping thoughts
            rather than a single fear about one outcome.
            """),
        new Framework("Eisenhower Matrix — Clarify Before Acting", """
            Framework: Eisenhower Matrix — Clarify Before Acting
            Core idea: An unclear task usually hides a missing decision.
            Identify the one question that, if answered, would make this
            actionable, then sort by what's actually urgent versus what only
            feels urgent. Best for tasks that feel stuck simply because the
            real next step hasn't been identified yet.
            """),
        new Framework("Pre-Mortem Analysis", """
            Framework: Pre-Mortem Analysis
            Core idea: Imagine the task or project has already failed. Work
            backward to identify the most likely reason why, then address that
            specific risk first rather than proceeding blindly. Best for
            unclear tasks that carry real risk of failure or wasted effort if
            started in the wrong direction.
            """),
        new Framework("SMART Goals", """
            Framework: SMART Goals
            Core idea: A vague goal can't be acted on. Rewrite it to be
            Specific, Measurable, Achievable, Relevant, and Time-bound before
            attempting it — vagueness is usually the actual blocker, not lack of
            effort. Best for objectives that feel important but too fuzzy to
            start.
            """),
        new Framework("Habit Stacking", """
            Framework: Habit Stacking
            Core idea: Attach the new, harder behavior directly after an
            existing, automatic routine (e.g. right after brushing your teeth,
            right after sitting down at your desk), borrowing the existing
            habit's momentum instead of relying on willpower alone. Best for
            recurring actionable tasks that need to become routine, not
            one-off tasks.
            """),
        new Framework("The Five-Minute Start", """
            Framework: The Five-Minute Start
            Core idea: Commit to only five minutes of work on the task, with
            explicit permission to stop after that. Starting is almost always
            the actual barrier, not finishing — momentum tends to carry past
            the five minutes once begun. Best for actionable tasks stalled by
            procrastination rather than by unclear next steps.
            """)
    );
}
