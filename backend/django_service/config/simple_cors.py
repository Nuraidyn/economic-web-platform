from django.conf import settings
from django.http import HttpResponse


class SimpleCORSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse(status=200)
        else:
            response = self.get_response(request)

        origin = request.META.get("HTTP_ORIGIN")
        allow_all = getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False)
        allowed_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", []) or []

        if origin and (allow_all or origin in allowed_origins):
            response["Access-Control-Allow-Origin"] = origin
            response["Vary"] = "Origin"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            response["Access-Control-Allow-Credentials"] = "true"

        return response
