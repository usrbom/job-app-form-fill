// Milestone 0 stub — full implementation in Milestone 5
Deno.serve(async (_req) => {
  return new Response(
    JSON.stringify({ message: "FormFill AI suggest — stub" }),
    { headers: { "Content-Type": "application/json" } }
  );
});
