from django.core.management.base import BaseCommand
from django.conf import settings
from ml.engine import train_all_models, generate_synthetic_training_data
from health_score.models import MLModelLog


class Command(BaseCommand):
    help = 'Train XGBoost, Random Forest and Linear Regression models'

    def add_arguments(self, parser):
        parser.add_argument('--model-version', type=str, default='v1.0', dest='model_version')

    def handle(self, *args, **options):
        self.stdout.write('Training all three models on synthetic data...\n')

        df = generate_synthetic_training_data(n_samples=5000)
        model_path = str(settings.ML_MODEL_PATH)

        results = train_all_models(df=df, model_path=model_path)

        MLModelLog.objects.filter(is_active=True).update(is_active=False)

        labels = {
            'xgboost':           'XGBoost',
            'random_forest':     'Random Forest',
            'linear_regression': 'Linear Regression',
        }

        for name, (model, metrics) in results.items():
            log = MLModelLog.objects.create(
                version=f"{options['model_version']}-{name}",
                mae=metrics['mae'],
                rmse=metrics['rmse'],
                r2_score=metrics['r2'],
                training_samples=metrics['training_samples'],
                is_active=(name == 'xgboost'),
                notes=f'{labels[name]} trained with synthetic data.',
            )
            self.stdout.write(self.style.SUCCESS(
                f"  {labels[name]:20s}  R²: {metrics['r2']:.4f}  "
                f"MAE: {metrics['mae']:.4f}  RMSE: {metrics['rmse']:.4f}"
            ))

        self.stdout.write(self.style.SUCCESS(f'\nAll models saved to: {model_path}'))
