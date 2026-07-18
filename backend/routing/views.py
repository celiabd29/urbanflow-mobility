"""Endpoints proxy vers OpenRouteService (la clé reste côté serveur)."""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services import ALLOWED_PROFILES, RoutingError, directions, geocode


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def geocode_view(request):
    """GET /api/routing/geocode/?q=adresse -> liste de lieux candidats."""
    query = (request.query_params.get('q') or '').strip()
    if len(query) < 3:
        return Response(
            {'detail': "La recherche doit contenir au moins 3 caractères."},
            status=400,
        )

    try:
        results = geocode(query)
    except RoutingError as exc:
        return Response({'detail': exc.message}, status=exc.status)

    return Response({'results': results})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def directions_view(request):
    """
    POST /api/routing/directions/
    Corps attendu : {"start": [lon, lat], "end": [lon, lat], "profile": "foot-walking"}
    """
    data = request.data or {}
    start = data.get('start')
    end = data.get('end')
    profile = data.get('profile', 'foot-walking')

    # Validation stricte des coordonnées avant tout appel externe.
    for name, point in (('start', start), ('end', end)):
        if (
            not isinstance(point, (list, tuple))
            or len(point) != 2
            or not all(isinstance(value, (int, float)) for value in point)
        ):
            return Response(
                {'detail': f"Le point '{name}' doit être [longitude, latitude]."},
                status=400,
            )

    try:
        result = directions(list(start), list(end), profile)
    except RoutingError as exc:
        return Response({'detail': exc.message}, status=exc.status)

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profiles_view(request):
    """GET /api/routing/profiles/ -> modes disponibles (évite de les figer côté front)."""
    return Response({'profiles': sorted(ALLOWED_PROFILES)})
