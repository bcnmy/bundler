{{/*
Expand the name of the chart.
*/}}
{{ define "chart.name" }}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}


{{- define "selectServer" -}}
{{- if eq .Values.env "production" -}}
https://acme-v02.api.letsencrypt.org/directory
{{- else -}}
https://acme-staging-v02.api.letsencrypt.org/directory
{{- end -}}
{{- end -}}




{{/*
DD-Trace lables and annotations
*/}}
{{- define "datadog.datatrace" }}
tags.datadoghq.com/env: {{ .Values.datadog.env }}
tags.datadoghq.com/service: {{ .Values.datadog.service }}
tags.datadoghq.com/version: {{ .Values.datadog.version }}
{{- end }}

{{- define "datadog.datatrace-admission" }}
# Enable Admission Controller to mutate new pods part of this deployment
admission.datadoghq.com/enabled: "true" 
{{ if and .Values.datadog.enable (eq .Values.datadog.gke_cluster_type "standard") }}
admission.datadoghq.com/config.mode: socket
# https://docs.datadoghq.com/containers/cluster_agent/admission_controller/?tab=helm#configure-apm-and-dogstatsd-communication-mode
{{- else if and .Values.datadog.enable (eq .Values.datadog.gke_cluster_type "autopilot") -}}
# gke autopilot cluster
{{- end }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "chart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}


{{- define "chart.namespace" -}}
  {{- if .Values.namespace -}}
    {{- .Values.namespace -}}
  {{- else -}}
    {{- .Release.Namespace -}}
  {{- end -}}
{{- end -}}


{{/*
Common labels
*/}}
{{- define "chart.labels" }}
helm.sh/chart: {{ include "chart.name" . }}
{{ include "chart.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{ end }}


{{/*
Create the name of the service account to use
*/}}
{{- define "chart.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "chart.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "chart.selectorLabels" }}
app.kubernetes.io/name: {{ include "chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app: {{ include "chart.name" . }}
{{- end }}

{{/*
Define metadata for configmap.
*/}}
{{- define "chart.staticconfigmap.metadata" -}}
name: {{ include "chart.name" . }}-env-configmap
namespace: {{ include "chart.namespace" . }}
labels:
{{ include "chart.labels" . | nindent 2 }}
{{- end }}

{{- define "chart.serviceaccount.name" -}}

  {{ include "chart.namespace"  .}}-service-account  
{{- end }}

{{- define "chart.serviceaccount.metadata" -}}
name: {{ include "chart.serviceaccount.name" . }}
namespace: {{ include "chart.namespace" . }}
labels:
{{ include "chart.labels" . | nindent 2 }}

{{- end }}

{{- define "chart.secret.name" -}}
{{ include "chart.name" . }}-passphrase
{{- end }}

{{/*
Define metadata for chart secret.
*/}}
{{- define "chart.secret.metadata" -}}
name: {{ include "chart.secret.name" . }}
namespace: {{ include "chart.namespace" . }}
labels:
{{ include "chart.labels" . | nindent 2 }}
{{- end }}




{{/*
Define metadata for chart pod.
*/}}
{{- define "chart.pod.metadata" -}}
name: {{ include "chart.name" . }}-r
namespace: {{ include "chart.namespace" . }}
labels:
{{ include "chart.labels" . | nindent 2 }}
{{- end }}

{{/*****************************************************************************/}}


{{/************************* Stateful set *******************************/}}
{{/*
Define metadata for statefulset.
*/}}

{{- define "chart.statefulset.name" -}}
{{ include "chart.name" . }}-statefulset
{{- end }}


{{- define "chart.statefulset.metadata" -}}
name: {{ include "chart.statefulset.name" . }}
namespace: {{ include "chart.namespace" . }}

labels:
{{- include "chart.labels" . | nindent 2 -}}
{{- if .Values.datadog.enable }}
{{ include "datadog.datatrace" . }}
{{- end }}
{{- end }}

{{- define "chart.template.metadata.labels" -}}
app.kubernetes.io/name: {{ include "chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app: {{ include "chart.name" . }}
namespace: {{ include "chart.namespace" . }}
{{- if .Values.datadog.enable -}}
{{ include "datadog.datatrace" . }}
{{ include "datadog.datatrace-admission" . }}
{{- end }}
{{- end }}



{{/*
Define annotations for statefulset's template.metadata
*/}}
{{- define "chart.template.metadata.annotations" -}}
{{- if .Values.datadog.enable }}
# https://github.com/DataDog/dd-trace-js/releases
admission.datadoghq.com/js-lib.version: {{ .Values.datadog.dd_js_lib_version }}
ad.datadoghq.com/nginx.logs: '[{"source":   {{ include "chart.name" . }}-pod, "service":"webapp"}]'

{{- end }}
releaseTime: {{ dateInZone "2006-01-02 15:04:05Z" (now) "UTC"| quote }}
{{- if .Values.prometheus.enabled }}
prometheus.io/scrape: "true"
prometheus.io/path: /metrics
prometheus.io/port: "3000"
{{- end }}
{{- end }}



{{/*********************************************************************/}}
{{/************************      Ingress   *************************/}}



{{/*
Define metadata for datadog configmap.
*/}}
{{- define "chart.datadogconfigmap.metadata" -}}
name: {{ include "chart.name" . }}-datadogconfigmap
namespace: {{ include "chart.namespace" . }}
{{- end }}

{{- define "chart.ingress.metadata" -}}
name: {{ include "chart.name" . }}-ingress
namespace: {{ include "chart.namespace" . }}
labels:
{{ include "chart.labels" . | nindent 2 }}
{{- end }}
{{/************************* Done *******************************/}}

{{/************************* Prometheus  *******************************/}}

{{- define "chart.adapter.metadata" -}}
name: {{ include "chart.name" . }}-adapter-configmap
namespace: {{ include "chart.namespace" . }}
labels:
{{ include "chart.labels" . | nindent 2 }}
{{- end }}

{{/************************* Done *******************************/}}

{{/************************* HPA *******************************/}}
{{- define "chart.hpa.name" -}}
{{ include "chart.name" . }}-hpa
{{- end }}

{{- define "chart.hpa.metadata" -}}
name: {{ include "chart.hpa.name" . }}
namespace: {{ include "chart.namespace" . }}
chainId: {{.Values.CHAIN_ID}}
labels:
{{ include "chart.labels" . | nindent 2 }}
{{- end }}


{{/************************* Service *******************************/}}

{{/*
Define metadata for service.
*/}}
{{- define "chart.service.name" -}}
{{ include "chart.name" . }}-service
{{- end }}


{{- define "chart.service.metadata" -}}
name: {{ include "chart.service.name" . }}
namespace: {{ include "chart.namespace" . }}
labels:
{{ include "chart.labels" . | nindent 2 }}
annotations:
  cloud.google.com/neg: '{"ingress": true}'
{{- end }}
