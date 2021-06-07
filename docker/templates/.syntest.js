module.exports = {
    seed: 'test',
    population_size: 10,
    max_depth: 5,

    // mutation chances
    resample_gene_chance: 0.01,
    delta_mutation_chance: 0.8,
    sample_func_as_arg: 0.5,
    explore_illegal_values: false,

    algorithm: "DynaMOSA",
    search_time: 30,
    total_time: 30,
    iteration_budget: 1000,

    probe_objective: true,

    // logging
    console_log_level: "info",
    log_to_file: ["info", "warn", "error"],
    exclude: ["./contracts/Migrations.sol"],
    include: ["./contracts/**/*.sol"],
}