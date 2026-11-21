# 05 — Arquitectura de N capas

Este capítulo remite a la definición técnica vigente en [`docs/architecture/n-layer-architecture.md`](../docs/architecture/n-layer-architecture.md).

La aplicación se organiza en siete capas: experiencia, presentación HTTP, aplicación, dominio, puertos, persistencia e infraestructura/composición. Cada cambio debe respetar la dirección de dependencias y usar los patrones Controller, Use Case, Policy, Repository, Adapter y Dependency Injection.

El estado real de la migración y los límites pendientes se mantienen en la documentación de arquitectura del proyecto; este capítulo no define una arquitectura alternativa.
