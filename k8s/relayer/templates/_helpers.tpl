{{/*
Expand the name of the chart.
*/}}
{{- define "relayers-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
DD-Trace lables and annotations
*/}}
{{- define "datadog.datatrace" -}}
tags.us5.datadoghq.com/env: {{ .Values.datadog.env }}
tags.us5.datadoghq.com/service: {{ .Values.datadog.service }}
tags.us5.datadoghq.com/version: {{ .Values.datadog.version }}
{{- end }}

{{- define "datadog.datatrace-admission" -}}
admission.us5.datadoghq.com/config.mode: socket
admission.us5.datadoghq.com/enabled: "true"
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "relayers-service.fullname" -}}
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

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "relayers-service.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "relayers-service.labels" -}}
helm.sh/chart: {{ include "relayers-service.chart" . }}
{{ include "relayers-service.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "relayers-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "relayers-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "relayers-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "relayers-service.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
