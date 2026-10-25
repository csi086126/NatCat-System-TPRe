import type { Model } from "./types";

export type OutputOptions = {
  gulOutput: boolean;
  ilOutput: boolean;
  riOutput: boolean;
  eptFullUncertaintyAep: boolean;
  eptFullUncertaintyOep: boolean;
  eptMeanSampleAep: boolean;
  eptMeanSampleOep: boolean;
  eptPerSampleMeanAep: boolean;
  eptPerSampleMeanOep: boolean;
  pseptAep: boolean;
  pseptOep: boolean;
  eltSample: boolean;
  eltQuantile: boolean;
  eltMoment: boolean;
  pltSample: boolean;
  pltQuantile: boolean;
  pltMoment: boolean;
  altPeriod: boolean;
  returnPeriodFile: boolean;
};

export const defaultOutputOptions: OutputOptions = {
  gulOutput: true,
  ilOutput: true,
  riOutput: false,
  eptFullUncertaintyAep: true,
  eptFullUncertaintyOep: true,
  eptMeanSampleAep: false,
  eptMeanSampleOep: false,
  eptPerSampleMeanAep: false,
  eptPerSampleMeanOep: false,
  pseptAep: false,
  pseptOep: false,
  eltSample: false,
  eltQuantile: false,
  eltMoment: false,
  pltSample: false,
  pltQuantile: false,
  pltMoment: false,
  altPeriod: false,
  returnPeriodFile: true,
};

export function modelSettingsDefaults(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const modelSettings = record.model_settings;
  if (!modelSettings || typeof modelSettings !== "object") return {};
  return Object.fromEntries(Object.entries(modelSettings as Record<string, unknown>).map(([key, setting]) => {
    if (setting && typeof setting === "object" && "default" in setting) {
      return [key, (setting as { default?: unknown }).default];
    }
    return [key, setting];
  }));
}

function ordOutput(options: OutputOptions) {
  return {
    ept_full_uncertainty_aep: options.eptFullUncertaintyAep,
    ept_full_uncertainty_oep: options.eptFullUncertaintyOep,
    ept_mean_sample_aep: options.eptMeanSampleAep,
    ept_mean_sample_oep: options.eptMeanSampleOep,
    ept_per_sample_mean_aep: options.eptPerSampleMeanAep,
    ept_per_sample_mean_oep: options.eptPerSampleMeanOep,
    psept_aep: options.pseptAep,
    psept_oep: options.pseptOep,
    elt_sample: options.eltSample,
    elt_quantile: options.eltQuantile,
    elt_moment: options.eltMoment,
    plt_sample: options.pltSample,
    plt_quantile: options.pltQuantile,
    plt_moment: options.pltMoment,
    alt_period: options.altPeriod,
    return_period_file: options.returnPeriodFile,
  };
}

function summary(options: OutputOptions) {
  return [{ id: 1, ord_output: ordOutput(options) }];
}

export function buildAnalysisSettings(
  model: Model,
  rawModelSettings: unknown,
  name: string,
  numberOfSamples: number,
  options: OutputOptions,
) {
  const modelSettings = modelSettingsDefaults(rawModelSettings);
  const settings: Record<string, unknown> = {
    version: "3",
    source_tag: "NatCatPlatform",
    analysis_tag: name,
    model_name_id: model.model_id || model.name || `model-${model.id}`,
    model_supplier_id: model.supplier_id || model.supplier || "OasisLMF",
    number_of_samples: numberOfSamples,
    gul_output: options.gulOutput,
    gul_summaries: options.gulOutput ? summary(options) : [],
    il_output: options.ilOutput,
    il_summaries: options.ilOutput ? summary(options) : [],
    ri_output: options.riOutput,
    ri_summaries: options.riOutput ? summary(options) : [],
    model_settings: modelSettings,
  };
  return settings;
}
