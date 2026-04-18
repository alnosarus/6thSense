export function ScrollStageSection({ stage, index }) {
  return (
    <section
      className="scroll-stop"
      data-stop={index}
      aria-labelledby={`stop-title-${stage.id}`}
    >
      <div className="scroll-stop-pinned">
        <p className="scroll-stop-kicker">{stage.kicker}</p>
        <h2 className="scroll-stop-title" id={`stop-title-${stage.id}`}>
          {stage.title}
        </h2>
        <p className="scroll-stop-body">{stage.body}</p>
      </div>
    </section>
  );
}
