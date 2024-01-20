{{/*
Expand the name of the chart.
*/}}
{{- define "chart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}


{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "Chart.fullname" -}}
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
{{- define "chart.labels" -}}
helm.sh/chart: {{ include "chart.name" . }}
{{ include "chart.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}


{{- define "chart.bundler.name" -}}
{{ .Values.bundlerName}}
{{- end }}



{{/*
Selector labels
*/}}
{{- define "chart.selectorLabels" -}}
app: {{ include "chart.bundler.name" . }}
{{- end }}

{{- define "chart.certificate.name" -}}
{{ include "chart.name" . }}-certificate
{{- end }}


{{- define "chart.clusterssuer.name" -}}
{{ include "chart.name" . }}-clusterssuer
{{- end }}

{{- define "chart.ingress.name" -}}
{{ include "chart.name" . }}-ingress
{{- end }}

{{- define "chart.ingress.metadata" -}}
name: {{ include "chart.ingress.name" . }}
namespace: {{ include "chart.namespace" . }}
labels:
{{ include "chart.labels" . | nindent 2 }}
{{- end }}

{{/*
Define metadata for chart pod.
*/}}
{{- define "chart.certificate.metadata" -}}
name: {{ include "chart.certificate.name" . }}
namespace: {{ include "chart.namespace" . }}
labels:
{{ include "chart.labels" . | nindent 2 }}
{{- end }}


{{/*
Define metadata for chart pod.
*/}}
{{- define "chart.clusterssuer.metadata" -}}
name: {{ include "chart.clusterssuer.name" . }}
namespace: {{ include "chart.namespace" . }}
labels:
{{ include "chart.labels" . | nindent 2 }}
{{- end }}


